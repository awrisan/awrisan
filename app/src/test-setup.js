import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.IntersectionObserver = IntersectionObserverMock;

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, "", "/");
});

afterEach(() => cleanup());
