defmodule BiService.MixProject do
  use Mix.Project

  def project do
    [
      app: :bi_service,
      version: "0.1.0",
      elixir: "~> 1.19",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      grpc: [
        protos: "priv/protos",
        generated_files: "lib/generated"
      ]
    ]
  end

  # Run "mix help compile.app" to learn about applications.
  def application do
    [
      extra_applications: [:logger],
      mod: {BiService.Application, []}
    ]
  end

  # Run "mix help deps" to learn about dependencies.
  defp deps do
    [
      {:plug_cowboy, "~> 2.7"},
      {:jason, "~> 1.4"},
      {:grpc, "~> 0.8"},
      {:google_protos, "~> 0.1"},
      {:absinthe, "~> 1.7"},
      {:absinthe_plug, "~> 1.5"},
      {:ecto_sql, "~> 3.11"}
    ]
  end
end
