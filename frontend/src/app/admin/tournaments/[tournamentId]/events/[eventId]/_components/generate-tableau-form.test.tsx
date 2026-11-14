import { fireEvent, render, screen } from "@testing-library/react";

import { Toaster } from "@/components/primitives/toast";
import { apiRequest } from "@/services/api-request";

import { GenerateTableauForm } from "./generate-tableau-form";

const push = jest.fn();
const TABLEAU_HREF = "/tournaments/t-1/events/e-1/tableau";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("../../../../../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

function submit(percent?: string) {
  render(
    <Toaster>
      <GenerateTableauForm directEliminationId="de 1" tableauHref={TABLEAU_HREF} />
    </Toaster>,
  );
  if (percent) {
    fireEvent.change(screen.getByLabelText(/Advance %/), { target: { value: percent } });
  }
  fireEvent.click(screen.getByRole("button", { name: "Generate tableau" }));
}

describe("GenerateTableauForm", () => {
  beforeEach(() => {
    push.mockClear();
    apiRequestMock.mockReset();
  });

  const cases = [
    {
      name: "confirms and goes to the tableau on success",
      result: () => Promise.resolve({}),
      message: "Tableau drawn",
      pushes: [[TABLEAU_HREF]],
    },
    {
      name: "shows the backend error and stays put on failure",
      result: () => Promise.reject(new Error("at least 2 fencers must advance to draw a tableau")),
      message: "at least 2 fencers must advance to draw a tableau",
      pushes: [],
    },
  ];

  it.each(cases)("$name", async ({ result, message, pushes }) => {
    apiRequestMock.mockImplementation(result);

    submit();

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(push.mock.calls).toEqual(pushes);
  });

  it("defaults to 100 percent", async () => {
    apiRequestMock.mockResolvedValue({});

    submit();

    await screen.findByText("Tableau drawn");
    expect(apiRequestMock).toHaveBeenCalledWith("/direct-eliminations/de%201/generate", {
      method: "POST",
      body: JSON.stringify({ advance_percent: 100 }),
    });
  });

  it("posts the edited percentage", async () => {
    apiRequestMock.mockResolvedValue({});

    submit("80");

    await screen.findByText("Tableau drawn");
    const [, init] = apiRequestMock.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toEqual({ advance_percent: 80 });
  });
});
