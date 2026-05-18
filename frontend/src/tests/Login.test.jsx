import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "../pages/Login";

describe("Login", () => {
  test("renderiza el formulario correctamente", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    expect(
      screen.getByPlaceholderText("usuario@instituto.es"),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(screen.getByText("Entrar")).toBeInTheDocument();
  });

  test("muestra error si los campos están vacíos", async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("Entrar"));
    expect(
      await screen.findByText("Por favor, rellena todos los campos."),
    ).toBeInTheDocument();
  });

  test("cambia de rol al hacer clic", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("Administrador"));
    expect(screen.getByText("Administrador")).toBeInTheDocument();
  });
});
