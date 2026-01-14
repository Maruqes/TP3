defmodule BiService.ApiGraphql do
  def list_books(_parent, _args, %{context: %{grpc_channel: channel}}) do
    with {:ok, %Messages.BookList{} = result} <- BiService.Grpc.get_books(channel) do
      books = result.books || []
      {:ok, Enum.map(books, &normalize_book/1)}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  def search_by_name(_parent, %{name: name}, %{context: %{grpc_channel: channel}}) do
    # step 1
    with {:ok, %Messages.BookList{} = result} <-
           BiService.Grpc.get_books_by_name(channel, name) do
      books = result.books || []
      {:ok, Enum.map(books, &normalize_book/1)}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  def search_by_author(_parent, %{author: author}, %{context: %{grpc_channel: channel}}) do
    # step 1
    with {:ok, %Messages.BookList{} = result} <-
           BiService.Grpc.get_books_by_author(channel, author) do
      books = result.books || []
      {:ok, Enum.map(books, &normalize_book/1)}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  def get_authors(_parent, _, %{context: %{grpc_channel: channel}}) do
    with {:ok, %Messages.AuthorList{} = result} <- BiService.Grpc.get_authors(channel) do
      authors = result.authors || []
      {:ok, Enum.map(authors, &normalize_author/1)}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  defp normalize_author(%Messages.Author{} = author) do
    %{
      name: author.name
    }
  end

  defp normalize_author(%{} = author) do
    %{
      name: Map.get(author, "name")
    }
  end

  defp normalize_book(%Messages.Book{} = book) do
    %{
      title: book.title,
      authors: format_authors(book.authors),
      publisher: book.publisher,
      isbn_10: book.isbn_10,
      isbn_13: book.isbn_13,
      description: book.description
    }
  end

  defp normalize_book(%{} = book) do
    %{
      title: Map.get(book, "title"),
      authors: format_authors(Map.get(book, "authors")),
      publisher: Map.get(book, "publisher"),
      isbn_10: Map.get(book, "isbn_10"),
      isbn_13: Map.get(book, "isbn_13"),
      description: Map.get(book, "description")
    }
  end

  defp format_authors(authors) when is_list(authors) do
    Enum.join(authors, ", ")
  end

  defp format_authors(authors) when is_binary(authors), do: authors
  defp format_authors(_), do: nil
end
