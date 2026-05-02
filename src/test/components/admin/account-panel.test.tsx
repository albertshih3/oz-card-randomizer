import { render, screen, fireEvent } from "@testing-library/react";

const mockOpenUserProfile = vi.fn();
let mockUser: {
  imageUrl: string;
  firstName: string;
  lastName: string;
  primaryEmailAddress: { emailAddress: string };
} | null;

vi.mock("@clerk/clerk-react", () => ({
  useClerk: () => ({ openUserProfile: mockOpenUserProfile }),
  useUser: () => ({ user: mockUser, isLoaded: true }),
}));

import { AccountPanel } from "@/components/admin/account-panel";

beforeEach(() => {
  mockUser = {
    imageUrl: "https://example.com/avatar.jpg",
    firstName: "Test",
    lastName: "User",
    primaryEmailAddress: { emailAddress: "test@zoo.org" },
  };
  vi.clearAllMocks();
});

describe("AccountPanel", () => {
  it("renders user name", () => {
    render(<AccountPanel />);
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("calls openUserProfile when clicked", () => {
    render(<AccountPanel />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockOpenUserProfile).toHaveBeenCalledTimes(1);
  });

  it("renders the manage account label", () => {
    render(<AccountPanel />);
    expect(screen.getByText("Manage your account")).toBeInTheDocument();
  });

  it("shows email when no name is set", () => {
    mockUser = {
      imageUrl: "",
      firstName: "",
      lastName: "",
      primaryEmailAddress: { emailAddress: "noname@zoo.org" },
    };
    render(<AccountPanel />);
    expect(screen.getByText("noname@zoo.org")).toBeInTheDocument();
  });
});
