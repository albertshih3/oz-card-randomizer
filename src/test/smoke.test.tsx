import { render, screen } from "@testing-library/react";

function Hello() {
  return <p>Hello from Vitest</p>;
}

describe("smoke test", () => {
  it("renders a React component", () => {
    render(<Hello />);
    expect(screen.getByText("Hello from Vitest")).toBeInTheDocument();
  });
});
