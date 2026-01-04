package apiexterna

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

type googleBooksResponse struct {
	Items []struct {
		VolumeInfo struct {
			Description string `json:"description"`
		} `json:"volumeInfo"`
	} `json:"items"`
}

func GetLivroDescription(ISBN string) (*string, error) {
	ISBN = strings.ReplaceAll(ISBN, "-", "")

	url := "https://www.googleapis.com/books/v1/volumes?q=isbn:" + ISBN
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var livro googleBooksResponse
	if err := json.Unmarshal(body, &livro); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	if len(livro.Items) == 0 {
		return nil, fmt.Errorf("no items found for ISBN %s", ISBN)
	}

	desc := livro.Items[0].VolumeInfo.Description
	return &desc, nil
}
