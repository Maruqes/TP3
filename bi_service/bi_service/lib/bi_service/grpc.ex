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

  @spec get_books(GRPC.Channel.t()) :: {:ok, Messages.ResponseMessage.t()} | {:error, any()}
  def get_books(channel) do
    request = %Messages.QueryMessage{query: "livros"}
    Messages.MessageService.Stub.send_message(channel, request)
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
