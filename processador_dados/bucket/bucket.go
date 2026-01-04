package bucket

import (
	"context"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/joho/godotenv"
)

var O_MEU_BALDE string = "TP3"

type Balde struct {
	client *s3.Client
}

func (b *Balde) GetFileFromBalde(ctx context.Context, filepath string) (*s3.GetObjectOutput, error) {
	obj, err := b.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: &O_MEU_BALDE,
		Key:    &filepath,
	})
	if err != nil {
		return nil, err
	}
	return obj, nil
}

func SetupBucket() (*Balde, error) {
	ctx := context.Background()

	err := godotenv.Load()
	if err != nil {
		log.Fatal("erro ao carregar .env:", err)
	}

	accessKey := os.Getenv("ACCESS_KEY")
	secretKey := os.Getenv("SECRET_KEY")
	endpoint := os.Getenv("ENDPOINT")

	if accessKey == "" || secretKey == "" || endpoint == "" {
		log.Fatal("ACCESS_KEY, SECRET_KEY e ENDPOINT devem estar definidos no .env")
	}

	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion("auto"),
		config.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(
				accessKey,
				secretKey,
				"",
			),
		),
	)
	if err != nil {
		log.Fatal("erro ao carregar configuração:", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = true
	})

	var b Balde
	b.client = client
	return &b, nil
}
