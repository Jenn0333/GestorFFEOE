// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from "vitest";
import { apiFetch } from "../utils/apiFetch";

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value;
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

describe("apiFetch", () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
  });

  test("añade el token JWT en el header", async () => {
    localStorage.setItem("token", "mi-token-falso");
    global.fetch.mockResolvedValue({ status: 200 });
    await apiFetch("/test");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/test"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mi-token-falso",
        }),
      }),
    );
  });

  test("limpia localStorage y redirige si el servidor devuelve 401", async () => {
    localStorage.setItem("token", "token-expirado");
    localStorage.setItem("role", "alumno");
    global.fetch.mockResolvedValue({ status: 401 });
    delete window.location;
    window.location = { href: "" };
    await apiFetch("/ruta-protegida");
    expect(localStorage.getItem("token")).toBeNull();
    expect(window.location.href).toBe("/");
  });
});
