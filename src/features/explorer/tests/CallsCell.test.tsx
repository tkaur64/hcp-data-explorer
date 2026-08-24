import {
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { configureStore } from "@reduxjs/toolkit";
import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CustomCellRendererProps } from "ag-grid-react";
import { Provider } from "react-redux";

import {
  toNumericCalls,
  type HcpEntity,
} from "../../../domain/hcp";
import {
  validateCalls,
} from "../../../infrastructure/provided/mock-validator";
import type { ExplorerDisplayRow } from "../utils/displayRows";
import explorerReducer from "../state/explorerSlice";
import { CallsCell } from "../components/CallsCell";

jest.mock("../../../infrastructure/provided/mock-validator");

const mockedValidateCalls =
  jest.mocked(validateCalls);

function createTestStore() {
  return configureStore({
    reducer: {
      explorer: explorerReducer,
    },
  });
}

type TestStore = ReturnType<typeof createTestStore>;

function findEditableEntity(
  store: TestStore,
): HcpEntity {
  const state = store.getState().explorer;

  for (const rowKey of state.ids) {
    const entity = state.entities[rowKey];

    if (!entity) {
      continue;
    }

    const calls = toNumericCalls(entity.calls);

    if (calls !== null && calls <= 60) {
      return entity;
    }
  }

  throw new Error("Expected an editable HCP");
}

function renderCallsCell(
  store: TestStore,
  entity: HcpEntity,
) {
  const cellProps = {
    data: entity,
  } as CustomCellRendererProps<ExplorerDisplayRow>;

  return render(
    <Provider store={store}>
      <CallsCell {...cellProps} />
    </Provider>,
  );
}

describe("CallsCell", () => {
  test("submits and displays an accepted Calls edit", async () => {
    mockedValidateCalls.mockResolvedValueOnce(
      undefined,
    );

    const store = createTestStore();
    const entity = findEditableEntity(store);
    const sourceCalls = toNumericCalls(entity.calls);

    if (sourceCalls === null) {
      throw new Error("Expected valid source Calls");
    }

    const newValue =
      sourceCalls === 20 ? 21 : 20;

    const user = userEvent.setup();

    renderCallsCell(store, entity);

    const input = screen.getByRole("spinbutton", {
      name: `Calls for ${entity.name}`,
    });

    await user.clear(input);
    await user.type(input, String(newValue));

    await user.click(
      screen.getByRole("button", {
        name: `Save Calls for ${entity.name}`,
      }),
    );

    expect(mockedValidateCalls).toHaveBeenCalledWith(
      newValue,
    );

    await waitFor(() => {
      expect(
        store.getState().explorer.edits[
        entity.rowKey
        ],
      ).toMatchObject({
        acceptedValue: newValue,
        status: "saved",
      });
    });

    expect(input).toHaveValue(newValue);
  });

  test("restores the accepted value after rejection", async () => {
    mockedValidateCalls.mockRejectedValueOnce(
      "exceeds per-HCP call cap (60)",
    );

    const store = createTestStore();
    const entity = findEditableEntity(store);
    const sourceCalls = toNumericCalls(entity.calls);

    if (sourceCalls === null) {
      throw new Error("Expected valid source Calls");
    }

    const user = userEvent.setup();

    renderCallsCell(store, entity);

    const input = screen.getByRole("spinbutton", {
      name: `Calls for ${entity.name}`,
    });

    await user.clear(input);
    await user.type(input, "61");

    await user.click(
      screen.getByRole("button", {
        name: `Save Calls for ${entity.name}`,
      }),
    );

    expect(mockedValidateCalls).toHaveBeenCalledWith(61);

    expect(
      await screen.findByText(
        "exceeds per-HCP call cap (60)",
      ),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole("spinbutton", {
          name: `Calls for ${entity.name}`,
        }),
      ).toHaveValue(sourceCalls);
    });

    expect(
      store.getState().explorer.history.past,
    ).toHaveLength(0);
  });

  test("rejects an empty value before server validation", async () => {
    const store = createTestStore();
    const entity = findEditableEntity(store);
    const user = userEvent.setup();

    renderCallsCell(store, entity);

    const input = screen.getByRole("spinbutton", {
      name: `Calls for ${entity.name}`,
    });

    await user.clear(input);

    await user.click(
      screen.getByRole("button", {
        name: `Save Calls for ${entity.name}`,
      }),
    );

    expect(
      screen.getByText("Calls is required"),
    ).toBeInTheDocument();

    expect(input).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    expect(
      mockedValidateCalls,
    ).not.toHaveBeenCalled();
  });
});