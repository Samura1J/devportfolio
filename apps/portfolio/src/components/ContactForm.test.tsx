import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContactForm } from "./ContactForm";

function fill(label: string, value: string) {
  fireEvent.input(screen.getByLabelText(label), { target: { value } });
}

function fillValid() {
  fill("Your name", "Jane Doe");
  fill("Email address", "jane@example.com");
  fill("Project details or role overview", "We need a React developer for a three-month build.");
}

const submit = () => {
  fireEvent.click(screen.getByRole("button", { name: /send message/i }));
};

describe("ContactForm", () => {
  it("shows field errors and focuses the first invalid field", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<ContactForm />);

    submit();

    const name = screen.getByLabelText("Your name");
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Please enter your name.")).toBeTruthy();
    expect(screen.getByText("Please enter a valid email address.")).toBeTruthy();
    expect(document.activeElement).toBe(name);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("clears a field's error as soon as it is edited", () => {
    render(<ContactForm />);
    submit();
    fill("Your name", "J");
    expect(screen.queryByText("Please enter your name.")).toBeNull();
  });

  it("posts the validated message and confirms", async () => {
    const fetchSpy = vi.fn(() => Promise.resolve(new Response(null, { status: 202 })));
    vi.stubGlobal("fetch", fetchSpy);
    render(<ContactForm />);

    fillValid();
    submit();

    expect(await screen.findByText(/your message is on its way/i)).toBeTruthy();
    expect(fetchSpy).toHaveBeenCalledWith("/api/v1/contact", expect.objectContaining({ method: "POST" }));
    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      name: "Jane Doe",
      inquiryType: "full-time",
      website: "",
    });
  });

  it("offers LinkedIn when the API is unavailable", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(null, { status: 503 }))));
    render(<ContactForm />);

    fillValid();
    submit();

    expect(await screen.findByText(/couldn’t be sent/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /linkedin/i })).toBeTruthy();
  });
});
