package handlers

import (
	"fmt"
	"time"
)

func newMongoID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

func bsonInt(v interface{}) int {
	switch n := v.(type) {
	case int:
		return n
	case int32:
		return int(n)
	case int64:
		return int(n)
	case float64:
		return int(n)
	default:
		return 0
	}
}

func parseImageFromMessage(msg string) (text, imageURL string) {
	const sep = "|IMG|"
	if i := len(msg); i > 0 {
		for idx := 0; idx < len(msg); idx++ {
			if idx+len(sep) <= len(msg) && msg[idx:idx+len(sep)] == sep {
				return msg[:idx], msg[idx+len(sep):]
			}
		}
	}
	return msg, ""
}

func messageWithImage(text, imageURL string) string {
	if imageURL == "" {
		return text
	}
	return text + "|IMG|" + imageURL
}
