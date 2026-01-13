defmodule BiService.ApiGraphql do
  def list_books(_parent, _args, %{context: %{grpc_channel: channel}}) do
    with {:ok, %Messages.ResponseMessage{} = result} <- BiService.Grpc.get_books(channel),
         {:ok, books} when is_list(books) <- Jason.decode(result.res) do
      IO.puts("books: " <> Jason.encode!(books))
      {:ok, Enum.map(books, &normalize_book/1)}
    else
      {:ok, _not_list} -> {:error, "grpc response is not a JSON list"}
      {:error, %Jason.DecodeError{} = error} -> {:error, Exception.message(error)}
      {:error, reason} -> {:error, reason}
    end
  end

  def list_book(_parent, %{id: _id}, %{context: %{grpc_channel: _channel}}) do
    {:ok,
     %{
        title: "titulo",
       authors: "autor1",
       publisher: "publisher1esss",
       isbn_10: "ISBN_10",
       isbn_13: "ISBN_13",
       description: "description"
     }}
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
