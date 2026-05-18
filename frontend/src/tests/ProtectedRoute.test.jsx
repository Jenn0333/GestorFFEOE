// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";

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

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("redirige al login si no hay token", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <ProtectedRoute rolRequerido="admin">
          <div>Contenido admin</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(screen.queryByText("Contenido admin")).not.toBeInTheDocument();
  });

  test("muestra el contenido si el rol es correcto", () => {
    localStorage.setItem("token", "fake-token");
    localStorage.setItem("role", "admin");
    render(
      <MemoryRouter>
        <ProtectedRoute rolRequerido="admin">
          <div>Contenido admin</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(screen.getByText("Contenido admin")).toBeInTheDocument();
  });

  test("redirige si el rol no coincide", () => {
    localStorage.setItem("token", "fake-token");
    localStorage.setItem("role", "alumno");
    render(
      <MemoryRouter>
        <ProtectedRoute rolRequerido="admin">
          <div>Contenido admin</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(screen.queryByText("Contenido admin")).not.toBeInTheDocument();
  });
});
