defmodule BiService.Router do
  use Plug.Router, copy_opts_to_assign: :router_opts
  import Plug.Conn

  plug(Plug.Parsers,
    parsers: [:json],
    pass: ["application/json"],
    json_decoder: Jason
  )

  plug(:put_absinthe_context)
  plug(:match)
  plug(:dispatch)

  @spec json(Plug.Conn.t(), atom() | 1..1_114_111, any()) :: Plug.Conn.t()
  def json(conn, status, input) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(status, Jason.encode!(input))
  end

  @spec teste(GRPC.Channel.t()) :: {:ok, Messages.ResponseMessage.t()} | {:error, any()}
  def teste(channel) do
    with request <- %Messages.QueryMessage{query: "mensagem"},
         {:ok, response} <- Messages.MessageService.Stub.send_message(channel, request) do
      {:ok, response}
    end
  end

  defp put_absinthe_context(conn, _opts) do
    if String.starts_with?(conn.request_path, "/graphql") or
         String.starts_with?(conn.request_path, "/graphiql") do
      channel_provider = conn.assigns.router_opts[:channel_provider] || BiService.Grpc
      channel = channel_provider.channel()

      Absinthe.Plug.put_options(conn, context: %{grpc_channel: channel})
    else
      conn
    end
  end

  get "/teste" do
    channel_provider = conn.assigns.router_opts[:channel_provider] || BiService.Grpc
    channel = channel_provider.channel()

    if is_nil(channel) do
      json(conn, 500, %{error: "grpc channel not configured"})
    else
      case teste(channel) do
        {:ok, response} ->
          json(conn, 200, %{response: response.res})

        {:error, reason} ->
          json(conn, 500, %{error: inspect(reason)})
      end
    end
  end

  forward("/graphql",
    to: Absinthe.Plug,
    init_opts: [schema: BiService.Logic]
  )

  forward("/graphiql",
    to: Absinthe.Plug.GraphiQL,
    init_opts: [schema: BiService.Logic, interface: :simple]
  )

  match _ do
    send_resp(conn, 404, "not found")
  end
end
