defmodule BiServiceTest do
  use ExUnit.Case
  doctest BiService

  test "greets the world" do
    assert BiService.hello() == :world
  end
end
