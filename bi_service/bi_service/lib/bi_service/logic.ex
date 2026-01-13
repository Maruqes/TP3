defmodule BiService.Logic do
  use Absinthe.Schema

  # receber um graphql query e usar resolvers
  object :book do
    field(:title, :string)
    field(:authors, :string)
    field(:publisher, :string)
    field(:isbn_10, :string)
    field(:isbn_13, :string)
    field(:description, :string)
  end

  query do
    field :books, list_of(:book) do
      resolve(&BiService.ApiGraphql.list_books/3)
    end

    field :book, :book do
      arg(:id, non_null(:id))
      resolve(&BiService.ApiGraphql.list_book/3)
    end
  end
end
