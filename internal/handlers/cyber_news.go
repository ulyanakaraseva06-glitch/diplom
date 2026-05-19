package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"
	"unicode"
)

type CybersportNewsItem struct {
	Title string `json:"title"`
	URL   string `json:"url"`
	Image string `json:"image"`
	Date  string `json:"date,omitempty"`
}

var (
	cyberNewsCache    []CybersportNewsItem
	cyberNewsCacheAt  time.Time
	cyberNewsCacheMu  sync.Mutex
	cyberNewsCacheTTL = 15 * time.Minute

	// Ссылки внутри блока «Главные новости»
	mainNewsHTMLLinkRe = regexp.MustCompile(
		`<a[^>]+href="(https://www\.cybersport\.ru/tags/[^"#?]+)"[^>]*>([\s\S]*?)</a>`,
	)
	mainNewsMDLinkRe = regexp.MustCompile(
		`\[([^\]]+)\]\((https://www\.cybersport\.ru/tags/[^)]+)\)`,
	)
	cyberNewsImageRe = regexp.MustCompile(`https://[^"\s]+\.(?:jpg|jpeg|png|webp)(?:\?[^"\s]*)?`)
	cyberNewsTimeRe  = regexp.MustCompile(`^\d{2}:\d{2}`)
	cyberNewsDayRe   = regexp.MustCompile(`^\d{2}\.\d{2}`)
	ogImageRe1       = regexp.MustCompile(`<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)`)
	ogImageRe2       = regexp.MustCompile(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image`)
	twitterImageRe   = regexp.MustCompile(`<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)`)
	imgTagRe         = regexp.MustCompile(`<img[^>]+(?:src|data-src)=["']([^"']+)["']`)
)

var cyberNewsHTTPClient = &http.Client{Timeout: 10 * time.Second}

// extractMainNewsSection — HTML между «Главные новости» и следующим крупным блоком.
func extractMainNewsSection(html string) string {
	lower := strings.ToLower(html)
	startMarkers := []string{"главные новости", "main-news", "mainnews"}
	endMarkers := []string{
		"актуальное",
		"настрой свою ленту",
		"рекомендации",
		"свежее",
		"обсуждаемое",
	}

	start := -1
	for _, m := range startMarkers {
		if i := strings.Index(lower, m); i >= 0 && (start < 0 || i < start) {
			start = i
		}
	}
	if start < 0 {
		return html
	}

	segment := html[start:]
	segLower := strings.ToLower(segment)
	end := len(segment)
	for _, em := range endMarkers {
		if i := strings.Index(segLower, em); i > 80 && i < end {
			end = i
		}
	}
	return segment[:end]
}

func slugToTitle(slug string) string {
	parts := strings.Split(slug, "/")
	if len(parts) == 0 {
		return slug
	}
	last := parts[len(parts)-1]
	last = strings.ReplaceAll(last, "-", " ")
	runes := []rune(last)
	if len(runes) > 0 {
		runes[0] = unicode.ToUpper(runes[0])
	}
	return string(runes)
}

func parseLinkLabel(raw string) (title, date string) {
	raw = strings.TrimSpace(raw)
	raw = strings.ReplaceAll(raw, "\n", " ")
	raw = regexp.MustCompile(`\s+`).ReplaceAllString(raw, " ")

	if cyberNewsTimeRe.MatchString(raw) {
		date = raw[:5]
		raw = strings.TrimSpace(raw[5:])
	} else if cyberNewsDayRe.MatchString(raw) {
		date = raw[:5]
		raw = strings.TrimSpace(raw[5:])
	}

	// убрать счётчик комментариев в конце (например «...org9» → «...org»)
	runes := []rune(strings.TrimSpace(raw))
	for len(runes) > 0 && unicode.IsDigit(runes[len(runes)-1]) {
		i := len(runes) - 1
		for i > 0 && unicode.IsDigit(runes[i-1]) {
			i--
		}
		if i < len(runes) && len(runes)-i <= 3 {
			runes = runes[:i]
		} else {
			break
		}
	}
	title = strings.TrimSpace(string(runes))
	title = strings.TrimPrefix(title, "Новость")
	return strings.TrimSpace(title), date
}

func parseMainNewsFromSection(section string) []CybersportNewsItem {
	seen := make(map[string]bool)
	items := make([]CybersportNewsItem, 0, 3)

	add := func(rawTitle, url string) {
		if len(items) >= 3 || url == "" || seen[url] {
			return
		}
		if strings.Contains(url, "/test-") || strings.Contains(strings.ToLower(rawTitle), "тест.") {
			return
		}
		seen[url] = true

		title, date := parseLinkLabel(rawTitle)
		if title == "" {
			path := strings.TrimPrefix(url, "https://www.cybersport.ru/tags/")
			title = slugToTitle(path)
		}
		if title == "" {
			return
		}

		image := findImageNearURL(section, url)

		items = append(items, CybersportNewsItem{
			Title: title,
			URL:   url,
			Image: image,
			Date:  date,
		})
	}

	// HTML-ссылки (порядок на странице = порядок в «Главных новостях»)
	for _, m := range mainNewsHTMLLinkRe.FindAllStringSubmatch(section, -1) {
		if len(items) >= 3 {
			break
		}
		raw := strings.TrimSpace(stripHTMLTags(m[2]))
		add(raw, m[1])
	}

	// Markdown-ссылки (если в ответе/SSR так отдаётся)
	if len(items) < 3 {
		for _, m := range mainNewsMDLinkRe.FindAllStringSubmatch(section, -1) {
			if len(items) >= 3 {
				break
			}
			add(m[1], m[2])
		}
	}

	return items
}

func findImageNearURL(section, url string) string {
	idx := strings.Index(section, url)
	if idx < 0 {
		return ""
	}
	chunk := section[clipLow(idx-2500):clipHigh(len(section), idx+400)]
	for _, m := range imgTagRe.FindAllStringSubmatch(chunk, -1) {
		src := normalizeImageURL(m[1])
		if isValidNewsImage(src) {
			return src
		}
	}
	if im := cyberNewsImageRe.FindString(chunk); im != "" {
		return normalizeImageURL(im)
	}
	return ""
}

func normalizeImageURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if strings.HasPrefix(raw, "//") {
		return "https:" + raw
	}
	if strings.HasPrefix(raw, "/") {
		return "https://www.cybersport.ru" + raw
	}
	return raw
}

func isValidNewsImage(url string) bool {
	if url == "" || !strings.HasPrefix(url, "http") {
		return false
	}
	lower := strings.ToLower(url)
	if strings.Contains(lower, "sprite") || strings.Contains(lower, "favicon") ||
		strings.Contains(lower, "1x1.gif") || strings.Contains(lower, "pixel.gif") {
		return false
	}
	return strings.Contains(lower, ".jpg") ||
		strings.Contains(lower, ".jpeg") ||
		strings.Contains(lower, ".png") ||
		strings.Contains(lower, ".webp") ||
		strings.Contains(lower, "cybersport")
}

func extractOGImage(html string) string {
	for _, re := range []*regexp.Regexp{ogImageRe1, ogImageRe2, twitterImageRe} {
		if m := re.FindStringSubmatch(html); len(m) > 1 {
			if img := normalizeImageURL(m[1]); isValidNewsImage(img) {
				return img
			}
		}
	}
	return ""
}

func fetchArticleImage(url string) string {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return ""
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("Accept-Language", "ru-RU,ru;q=0.9")

	resp, err := cyberNewsHTTPClient.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return ""
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 512<<10))
	if err != nil {
		return ""
	}
	return extractOGImage(string(body))
}

func enrichNewsImages(items []CybersportNewsItem) {
	var wg sync.WaitGroup
	for i := range items {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			if img := fetchArticleImage(items[idx].URL); img != "" {
				items[idx].Image = img
			}
		}(i)
	}
	wg.Wait()
}

func stripHTMLTags(s string) string {
	s = regexp.MustCompile(`<[^>]+>`).ReplaceAllString(s, "")
	s = strings.ReplaceAll(s, "&nbsp;", " ")
	s = strings.ReplaceAll(s, "&quot;", `"`)
	s = strings.ReplaceAll(s, "&#39;", "'")
	s = strings.ReplaceAll(s, "&amp;", "&")
	return strings.TrimSpace(s)
}

func fetchCybersportNews() ([]CybersportNewsItem, error) {
	req, err := http.NewRequest(http.MethodGet, "https://www.cybersport.ru/", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("Accept-Language", "ru-RU,ru;q=0.9")

	resp, err := cyberNewsHTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return nil, err
	}

	section := extractMainNewsSection(string(body))
	items := parseMainNewsFromSection(section)

	if len(items) == 0 {
		items = defaultCybersportNews()
	}

	enrichNewsImages(items)

	for i := range items {
		if items[i].Image == "" || !isValidNewsImage(items[i].Image) {
			items[i].Image = defaultNewsImage(i)
		}
	}
	return items, nil
}

func defaultNewsImage(i int) string {
	return "https://www.cybersport.ru/static/images/og-image.jpg"
}

func defaultCybersportNews() []CybersportNewsItem {
	return []CybersportNewsItem{
		{
			Title: "Spirit вернулась в топ-3 лучших команд мира по версии HLTV.org",
			URL:   "https://www.cybersport.ru/tags/cs2/spirit-vernulas-v-top-3-luchshikh-komand-mira-po-versii-hltv-org",
			Date:  "00:54",
			Image: defaultNewsImage(0),
		},
		{
			Title: "By_Owl Team оказалась сильнее состава TpaBoMaH на BetBoom Streamers Battle 13",
			URL:   "https://www.cybersport.ru/tags/dota-2/by-owl-team-okazalas-silneye-sostava-tpabomah-na-betboom-streamers-battle-13",
			Date:  "18.05",
			Image: defaultNewsImage(1),
		},
		{
			Title: "Nix о команде NS на BetBoom Streamers Battle 13: «Оба саппа у них — ультработы»",
			URL:   "https://www.cybersport.ru/tags/dota-2/nix-o-komande-ns-na-betboom-streamers-battle-13-oba-sappa-u-nikh-ultraboty",
			Date:  "18.05",
			Image: defaultNewsImage(2),
		},
	}
}

func clipLow(v int) int {
	if v < 0 {
		return 0
	}
	return v
}

func clipHigh(limit, v int) int {
	if v > limit {
		return limit
	}
	return v
}

// GetCybersportNews — три первые новости из раздела «Главные новости» на cybersport.ru
func GetCybersportNews(w http.ResponseWriter, r *http.Request) {
	cyberNewsCacheMu.Lock()
	if len(cyberNewsCache) > 0 && time.Since(cyberNewsCacheAt) < cyberNewsCacheTTL {
		items := cyberNewsCache
		cyberNewsCacheMu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(items)
		return
	}
	cyberNewsCacheMu.Unlock()

	items, err := fetchCybersportNews()
	if err != nil {
		log.Printf("GetCybersportNews: %v, using fallback", err)
		items = defaultCybersportNews()
	}
	if len(items) > 3 {
		items = items[:3]
	}

	cyberNewsCacheMu.Lock()
	cyberNewsCache = items
	cyberNewsCacheAt = time.Now()
	cyberNewsCacheMu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}
