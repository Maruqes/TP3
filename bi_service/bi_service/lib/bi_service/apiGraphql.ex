defmodule BiService.ApiGraphql do
  def list_books(_parent, _args, %{context: %{grpc_channel: channel}}) do
    with {:ok, %Messages.ResponseMessage{} = result} <- BiService.Grpc.get_books(channel),
         {:ok, books} when is_list(books) <- Jason.decode(result.res) do
      IO.puts("books: " <> Jason.encode!(books))
      {:ok, Enum.map(books, &normalize_book/1)}
    else
      {:error, %Jason.DecodeError{} = error} -> {:error, Exception.message(error)}
      {:error, reason} -> {:error, reason}
    end
  end

  def search_by_name(_parent, %{name: name}, %{context: %{grpc_channel: channel}}) do
    # step 1
    with {:ok, %Messages.ResponseMessage{} = result} <-
           BiService.Grpc.get_books_by_name(channel, name),
         # step 2
         {:ok, books} <- Jason.decode(result.res) do
      IO.puts("books: " <> Jason.encode!(books))
      {:ok, Enum.map(books, &normalize_book/1)}
    else
      {:error, %Jason.DecodeError{} = error} -> {:error, Exception.message(error)}
      {:error, reason} -> {:error, reason}
    end
  end

  def search_by_author(_parent, %{author: author}, %{context: %{grpc_channel: channel}}) do
    # step 1
    with {:ok, %Messages.ResponseMessage{} = result} <-
           BiService.Grpc.get_books_by_author(channel, author),
         {:ok, books} <- Jason.decode(result.res) do
      IO.puts("books: " <> Jason.encode!(books))
      {:ok, Enum.map(books, &normalize_book/1)}
    else
      {:error, %Jason.DecodeError{} = error} -> {:error, Exception.message(error)}
      {:error, reason} -> {:error, reason}
    end
  end

  def get_authors(_parent, _, %{context: %{grpc_channel: channel}}) do
    with {:ok, %Messages.ResponseMessage{} = result} <- BiService.Grpc.get_authors(channel),
         {:ok, authors} <- Jason.decode(result.res) do
      IO.puts("authors: " <> Jason.encode!(authors))
      {:ok, Enum.map(authors, &normalize_author/1)}
    else
      {:error, %Jason.DecodeError{} = error} -> {:error, Exception.message(error)}
      {:error, reason} -> {:error, reason}
    end
  end

  defp normalize_author(%{} = author) do
    %{
      name: Map.get(author, "name")
    }
  end

  defp normalize_book(%{} = book) do
    %{
      title: Map.get(book, "title"),
      authors: Map.get(book, "authors"),
      publisher: Map.get(book, "publisher"),
      isbn_10: Map.get(book, "isbn_10"),
      isbn_13: Map.get(book, "isbn_13"),
      description: Map.get(book, "description")
    }
  end
end
