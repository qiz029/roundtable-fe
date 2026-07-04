import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PillInput, PillList } from "./Pill";

function ControlledPillInput() {
  const [values, setValues] = useState(["alpha"]);

  return (
    <>
      <PillInput value={values} onChange={setValues} ariaLabel="Tags" prefix="#" />
      <output aria-label="Current tags">{values.join(",")}</output>
    </>
  );
}

describe("PillList", () => {
  it("does not render an empty row for empty values", () => {
    const { container } = render(<PillList values={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("PillInput", () => {
  it("adds pasted and typed values, then removes values", async () => {
    const user = userEvent.setup();
    render(<ControlledPillInput />);

    const input = screen.getByLabelText("Tags");
    await user.type(input, "beta ");
    await user.click(screen.getByLabelText("Remove alpha"));
    await user.click(input);
    await user.paste("gamma,delta");

    expect(screen.getByLabelText("Current tags")).toHaveTextContent("beta,gamma,delta");
    expect(screen.getByText("#beta")).toBeInTheDocument();
    expect(screen.queryByText("#alpha")).not.toBeInTheDocument();
  });
});
