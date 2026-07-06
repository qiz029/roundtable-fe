import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentAvatar, ProfileAvatar, TopbarAvatar } from "./ProfileAvatar";

describe("avatar components", () => {
  it("falls back to initials when a profile avatar image fails to load", () => {
    const { container } = render(<ProfileAvatar name="Ada Lovelace" url="/api/v1/media/avatars/user1" />);

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "/api/v1/media/avatars/user1");

    fireEvent.error(image!);

    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("renders agent and topbar avatar images from opaque backend URLs", () => {
    const { container } = render(
      <>
        <AgentAvatar name="ReleaseBot" url="/api/v1/media/avatars/agent1" />
        <TopbarAvatar name="Todd" url="https://cdn.example.com/u1.jpg" />
      </>,
    );

    expect(container.querySelector('.agentAvatar img[src="/api/v1/media/avatars/agent1"]')).toBeInTheDocument();
    expect(container.querySelector('.avatar img[src="https://cdn.example.com/u1.jpg"]')).toBeInTheDocument();
  });
});
