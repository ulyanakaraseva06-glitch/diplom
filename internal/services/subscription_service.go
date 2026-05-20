package services

import (
    "context"
    "log"

    "esports-manager/internal/models"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/mongo"
)

type SubscriptionService struct {
    mongoDB *mongo.Database
}

func NewSubscriptionService(mongoDB *mongo.Database) *SubscriptionService {
    return &SubscriptionService{mongoDB: mongoDB}
}

func (s *SubscriptionService) InitSubscriptions(ctx context.Context) error {
    log.Println("Initializing subscriptions...")

    subscriptions := []models.Subscription{
        {
            ID:         "sub_user",
            Name:       "Для пользователя",
            Price:      149,
            TargetType: "user",
            Benefits: []string{
                "VIP турниры",
                "Премиум статус",
                "Возможность менять имя",
            },
        },
        {
            ID:         "sub_team",
            Name:       "Для команды",
            Price:      599,
            TargetType: "team",
            Benefits: []string{
                "VIP турниры",
                "Скидка 10% на первый игровой взнос",
                "Возможность менять имя всем членам команды",
                "Неограниченное количество чатов-групп для каждого члена команды",
            },
        },
        {
            ID:         "sub_organizer",
            Name:       "Для организатора",
            Price:      1499,
            TargetType: "organizer",
            Benefits: []string{
                "Быстрая обработка заявки",
                "Возможность выбрать для турнира статус VIP",
            },
        },
    }

    for _, sub := range subscriptions {
        var existing models.Subscription
        err := s.mongoDB.Collection("subscriptions").FindOne(ctx, bson.M{"id": sub.ID}).Decode(&existing)
        if err == mongo.ErrNoDocuments {
            _, err = s.mongoDB.Collection("subscriptions").InsertOne(ctx, sub)
            if err != nil {
                log.Printf("Failed to insert subscription %s: %v", sub.ID, err)
            }
            continue
        }
        if err == nil && existing.TargetType != sub.TargetType {
            _, _ = s.mongoDB.Collection("subscriptions").UpdateOne(ctx,
                bson.M{"id": sub.ID},
                bson.M{"$set": bson.M{"target_type": sub.TargetType, "name": sub.Name, "price": sub.Price, "benefits": sub.Benefits}},
            )
        }
    }

    log.Println("Subscriptions initialized")
    return nil
}