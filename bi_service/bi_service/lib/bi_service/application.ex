defmodule BiService.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {GRPC.Client.Supervisor, []},
      {BiService.Grpc, []},
      {Plug.Cowboy,
       scheme: :http,
       plug: {BiService.Router, channel_provider: BiService.Grpc},
       options: [port: 4000]}
    ]

    opts = [strategy: :one_for_one, name: BiService.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
