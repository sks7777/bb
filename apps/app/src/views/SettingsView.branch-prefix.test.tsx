// @vitest-environment jsdom
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneralSettingsSection, PrivacySettingsSection } from "./SettingsView";

afterEach(cleanup);

function renderSection(overrides?: {
  completedOutputRetentionDays?: number | undefined;
  onCompletedOutputRetentionDaysChange?: (days: number) => void;
  confirmThreadArchive?: boolean;
  onConfirmThreadArchiveChange?: (enabled: boolean) => void;
  desktopBrowserAvailable?: boolean;
  telemetryEnabled?: boolean;
  onTelemetryEnabledChange?: (enabled: boolean) => void;
  managedBranchPrefix?: string;
  onManagedBranchPrefixChange?: (prefix: string) => void;
}) {
  return render(
    <>
      <GeneralSettingsSection
        completedOutputRetentionDays={
          overrides && "completedOutputRetentionDays" in overrides
            ? overrides.completedOutputRetentionDays
            : 7
        }
        onCompletedOutputRetentionDaysChange={
          overrides?.onCompletedOutputRetentionDaysChange ?? vi.fn()
        }
        showGitChanges={true}
        onShowGitChangesChange={vi.fn()}
        confirmThreadArchive={overrides?.confirmThreadArchive ?? true}
        onConfirmThreadArchiveChange={
          overrides?.onConfirmThreadArchiveChange ?? vi.fn()
        }
        desktopBrowserAvailable={overrides?.desktopBrowserAvailable ?? false}
        generalSettingsDisabled={false}
        managedBranchPrefix={overrides?.managedBranchPrefix ?? "bb/"}
        navigateToThreadAfterCreate={false}
        onManagedBranchPrefixChange={
          overrides?.onManagedBranchPrefixChange ?? vi.fn()
        }
        onNavigateToThreadAfterCreateChange={vi.fn()}
        onOpenLinksInAppBrowserChange={vi.fn()}
        onRewriteLocalhostLinksChange={vi.fn()}
        onSteerActiveThreadOnEnterChange={vi.fn()}
        openLinksInAppBrowser={false}
        rewriteLocalhostLinks={false}
        steerActiveThreadOnEnter={false}
      />
      <PrivacySettingsSection
        disabled={false}
        enabled={false}
        onEnabledChange={vi.fn()}
        onStreamerModeChange={vi.fn()}
        streamerMode={false}
        telemetryEnabled={overrides?.telemetryEnabled ?? true}
        onTelemetryEnabledChange={
          overrides?.onTelemetryEnabledChange ?? vi.fn()
        }
      />
    </>,
  );
}

function branchPrefixInput() {
  const input = screen.getByLabelText("New branch prefix");
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("New branch prefix control is not an input");
  }
  return input;
}

describe("new branch prefix setting", () => {
  it("saves a valid prefix on Enter", () => {
    const onChange = vi.fn();
    renderSection({ onManagedBranchPrefixChange: onChange });
    const input = branchPrefixInput();
    fireEvent.change(input, { target: { value: "sawyer/wt-" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("sawyer/wt-");
  });

  it("saves an empty prefix", () => {
    const onChange = vi.fn();
    renderSection({ onManagedBranchPrefixChange: onChange });
    const input = branchPrefixInput();
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("restores the saved value when saving fails", async () => {
    const failedSave = Promise.reject(new Error("write failed"));
    void failedSave.catch(() => undefined);
    const onChange = vi.fn(() => failedSave);
    renderSection({ onManagedBranchPrefixChange: onChange });
    const input = branchPrefixInput();
    fireEvent.change(input, { target: { value: "team/" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(input.value).toBe("bb/"));
  });

  it("refuses an invalid prefix and restores the saved value", () => {
    const onChange = vi.fn();
    renderSection({ onManagedBranchPrefixChange: onChange });
    const input = branchPrefixInput();
    fireEvent.change(input, { target: { value: "bad prefix/" } });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe("bb/");
  });

  it("reverts the draft on Escape", () => {
    const onChange = vi.fn();
    renderSection({ onManagedBranchPrefixChange: onChange });
    const input = branchPrefixInput();
    fireEvent.change(input, { target: { value: "sawyer/" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("bb/");
    expect(onChange).not.toHaveBeenCalled();
  });
});

function fullOutputRetentionInput() {
  const input = screen.getByLabelText("Full output retention");
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Full output retention control is not an input");
  }
  return input;
}

describe("full output retention setting", () => {
  it("saves a valid retention on Enter", () => {
    const onChange = vi.fn();
    renderSection({ onCompletedOutputRetentionDaysChange: onChange });
    const input = fullOutputRetentionInput();
    fireEvent.change(input, { target: { value: "365" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(365);
  });

  it("refuses an out-of-range retention and restores the saved value", () => {
    const onChange = vi.fn();
    renderSection({ onCompletedOutputRetentionDaysChange: onChange });
    const input = fullOutputRetentionInput();
    fireEvent.change(input, { target: { value: "3651" } });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe("7");
  });

  it("hides the control when the server does not provide the field", () => {
    renderSection({ completedOutputRetentionDays: undefined });
    expect(screen.queryByLabelText("Full output retention")).toBeNull();
  });
});

describe("localhost link rewrite setting", () => {
  it("hides the ineffective setting on localhost", () => {
    renderSection();
    expect(screen.queryByText("Rewrite localhost links")).toBeNull();
    expect(screen.queryByText("Links")).toBeNull();
  });

  it("keeps the Links section for the in-app browser setting", () => {
    renderSection({ desktopBrowserAvailable: true });
    expect(screen.getByText("Links")).not.toBeNull();
    expect(screen.queryByText("Rewrite localhost links")).toBeNull();
  });
});

it("shows the saved telemetry preference and allows opting out", () => {
  const onChange = vi.fn();
  renderSection({ onTelemetryEnabledChange: onChange });
  const toggle = screen.getByRole("switch", {
    name: "Share anonymous usage data",
  });
  expect(toggle.getAttribute("aria-checked")).toBe("true");
  fireEvent.click(toggle);
  expect(onChange).toHaveBeenCalledWith(false);
  cleanup();
  renderSection({ telemetryEnabled: false });
  expect(
    screen
      .getByRole("switch", { name: "Share anonymous usage data" })
      .getAttribute("aria-checked"),
  ).toBe("false");
});

it("allows disabling archive confirmation and shows the saved preference", () => {
  const onChange = vi.fn();
  renderSection({ onConfirmThreadArchiveChange: onChange });
  const toggle = screen.getByRole("switch", {
    name: "Thread archive confirmation",
  });
  expect(toggle.getAttribute("aria-checked")).toBe("true");
  fireEvent.click(toggle);
  expect(onChange).toHaveBeenCalledWith(false);
  cleanup();
  renderSection({ confirmThreadArchive: false });
  expect(
    screen
      .getByRole("switch", { name: "Thread archive confirmation" })
      .getAttribute("aria-checked"),
  ).toBe("false");
});
