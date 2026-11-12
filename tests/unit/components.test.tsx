import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProgressRing } from "@/components/ds/ProgressRing";
import { Stamp } from "@/components/ds/Sticker";
import { TactileSegmented } from "@/components/ds/TactileSegmented";
import { activeNavIndex } from "@/lib/nav";

const OPTIONS = [
  { value: "chat", label: "Chat" },
  { value: "resep", label: "Resep" },
  { value: "ingatan", label: "Ingatan" },
];

describe("TactileSegmented", () => {
  it("is a radiogroup with exactly one checked, tabbable radio", () => {
    render(<TactileSegmented label="Tanya Ata" value="resep" onChange={() => {}} options={OPTIONS} />);
    expect(screen.getByRole("radiogroup", { name: "Tanya Ata" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
  });

  it("moves with arrow keys, wraps, and supports Home/End", () => {
    const onChange = vi.fn();
    render(<TactileSegmented label="Tanya Ata" value="ingatan" onChange={onChange} options={OPTIONS} />);
    const last = screen.getByRole("radio", { name: "Ingatan" });
    fireEvent.keyDown(last, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("chat");
    fireEvent.keyDown(last, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("resep");
    fireEvent.keyDown(last, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith("chat");
  });

  it("does not fire onChange when the current option is clicked again", () => {
    const onChange = vi.fn();
    render(<TactileSegmented label="Tanya Ata" value="chat" onChange={onChange} options={OPTIONS} />);
    fireEvent.click(screen.getByRole("radio", { name: "Chat" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("ProgressRing", () => {
  it("clamps and announces the value in words", () => {
    render(<ProgressRing value={140} label="LKTI" />);
    expect(screen.getByRole("img", { name: "LKTI: 100 persen" })).toBeInTheDocument();
    render(<ProgressRing value={-5} label="Poster" />);
    expect(screen.getByRole("img", { name: "Poster: 0 persen" })).toBeInTheDocument();
  });
});

describe("Stamp", () => {
  it("shows H-n and marks the last three days as soon", () => {
    const { container, rerender } = render(<Stamp daysLeft={12} />);
    expect(container.textContent).toContain("H-12");
    expect(container.querySelector(".stamp")).toHaveAttribute("data-urgency", "normal");
    rerender(<Stamp daysLeft={3} />);
    expect(container.querySelector(".stamp")).toHaveAttribute("data-urgency", "soon");
    rerender(<Stamp daysLeft={0} />);
    expect(container.textContent).toContain("Hari ini");
  });
});

describe("activeNavIndex", () => {
  it("matches a tab and its nested routes only", () => {
    expect(activeNavIndex("/hari-ini")).toBe(0);
    expect(activeNavIndex("/ata/resep/business-plan")).toBe(2);
    expect(activeNavIndex("/atap")).toBe(-1);
    expect(activeNavIndex("/styleguide")).toBe(-1);
  });
});
