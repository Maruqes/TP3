defmodule BiService.Grpc do
  use GenServer

  @spec start_link(keyword()) :: GenServer.on_start()
  def start_link(_opts) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  @spec channel() :: GRPC.Channel.t()
  def channel do
    GenServer.call(__MODULE__, :channel)
  end

  @spec get_books(GRPC.Channel.t()) :: {:ok, Messages.BookList.t()} | {:error, any()}
  def get_books(channel) do
    request = %Messages.Empty{}
    Messages.BookService.Stub.list_books(channel, request)
  end

  @spec get_books_by_name(GRPC.Channel.t(), String.t()) ::
          {:ok, Messages.BookList.t()} | {:error, any()}
  def get_books_by_name(channel, name) do
    request = %Messages.SearchRequest{query: name}
    Messages.BookService.Stub.search_books_by_name(channel, request)
  end

  @spec get_books_by_author(GRPC.Channel.t(), binary()) ::
          {:ok, Messages.BookList.t()} | {:error, any()}
  def get_books_by_author(channel, author) do
    request = %Messages.SearchRequest{query: author}
    Messages.BookService.Stub.search_books_by_author(channel, request)
  end

  @spec get_authors(GRPC.Channel.t()) :: {:ok, Messages.AuthorList.t()} | {:error, any()}
  def get_authors(channel) do
    request = %Messages.Empty{}
    Messages.BookService.Stub.list_authors(channel, request)
  end

  @impl true
  def init(_opts) do
    case GRPC.Stub.connect("localhost:50051") do
      {:ok, channel} -> {:ok, channel}
      {:error, reason} -> {:stop, reason}
    end
  end

  @impl true
  def handle_call(:channel, _from, channel) do
    {:reply, channel, channel}
  end
end
