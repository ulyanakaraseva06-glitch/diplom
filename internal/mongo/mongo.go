package mongo

import (
    "context"
    "fmt"
    "log"
    "time"

    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

type MongoClient struct {
    Client   *mongo.Client
    Database *mongo.Database
}

func NewMongoClient(uri, dbName string) (*MongoClient, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
    if err != nil {
        return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
    }

    err = client.Ping(ctx, nil)
    if err != nil {
        return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
    }

    log.Println("Connected to MongoDB")
    return &MongoClient{
        Client:   client,
        Database: client.Database(dbName),
    }, nil
}

func (m *MongoClient) Close() {
    if m.Client != nil {
        m.Client.Disconnect(context.Background())
        log.Println("MongoDB connection closed")
    }
}