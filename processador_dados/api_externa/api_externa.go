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
			ImageLinks  struct {
				SmallThumbnail string `json:"smallThumbnail"`
				Thumbnail      string `json:"thumbnail"`
			} `json:"imageLinks"`
		} `json:"volumeInfo"`
	} `json:"items"`
}

func GetLivroDescription(ISBN string) (*string, *string, *string, error) {
	ISBN = strings.ReplaceAll(ISBN, "-", "")

	url := "https://www.googleapis.com/books/v1/volumes?q=isbn:" + ISBN
	resp, err := http.Get(url)
	if err != nil {
		return nil, nil, nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, nil, err
	}

	var livro googleBooksResponse
	if err := json.Unmarshal(body, &livro); err != nil {
		return nil, nil, nil, fmt.Errorf("decode response: %w", err)
	}
	if len(livro.Items) == 0 {
		return nil, nil, nil, fmt.Errorf("no items found for ISBN %s", ISBN)
	}

	desc := livro.Items[0].VolumeInfo.Description
	smallThumb := livro.Items[0].VolumeInfo.ImageLinks.SmallThumbnail
	thumb := livro.Items[0].VolumeInfo.ImageLinks.Thumbnail
	return &desc, &smallThumb, &thumb, nil
}
