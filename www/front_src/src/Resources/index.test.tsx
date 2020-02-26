import React from 'react';

import axios from 'axios';
import { render, wait, within, fireEvent } from '@testing-library/react';
import UserEvent from '@testing-library/user-event';

import Resources from '.';
import {
  labelUnhandledProblems,
  labelResourceProblems,
  labelAll,
} from './translatedLabels';
import columns from './columns';
import { Resource } from './models';

const mockedAxios = axios as jest.Mocked<typeof axios>;

const baseEndpoint = 'monitoring/resources';
const defaultPageAndLimitParams = 'page=1&limit=10';
const defaultListingEndpoint = `${baseEndpoint}?state=["unhandled_problems]&${defaultPageAndLimitParams}`;

const getEndpoint = ({
  state = 'unhandled_problems',
  sortBy = undefined,
  sortOrder = undefined,
  page = 1,
  limit = 10,
}: {
  state?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}): string => {
  const sortParam = sortBy ? `&sort_by={"${sortBy}":"${sortOrder}"}` : '';

  return `${baseEndpoint}?state=["${state}"]${sortParam}&page=${page}&limit=${limit}`;
};

const cancelTokenRequestParam = { cancelToken: {} };

export const selectOption = (element, optionText): void => {
  const selectButton = element.parentNode.querySelector('[role=button]');

  UserEvent.click(selectButton);

  const listbox = document.body.querySelector(
    'ul[role=listbox]',
  ) as HTMLElement;

  const listItem = within(listbox).getByText(optionText);
  UserEvent.click(listItem);
};

const fillEntities = (): Array<Resource> => {
  const entityCount = 31;
  return new Array(entityCount).fill(0).map((_, index) => ({
    id: `${index}`,
    name: `E${index}`,
    status: {
      code: 0,
      name: 'OK',
    },
    acknowledged: false,
    in_downtime: false,
    duration: '1m',
    last_check: '1m',
    tries: '1',
    short_name: 's',
    information: `Entity ${index}`,
  }));
};

describe(Resources, () => {
  afterEach(() => {
    mockedAxios.get.mockReset();
  });

  beforeEach(() => {
    const entities = fillEntities();
    mockedAxios.get.mockResolvedValue({
      data: {
        result: entities,
        meta: {
          page: 1,
          limit: 10,
          search: {},
          sort_by: {},
          total: entities.length,
        },
      },
    });
  });

  it('lists with unhnandled_problems state by default', async () => {
    render(<Resources />);

    await wait(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        defaultListingEndpoint,
        cancelTokenRequestParam,
      ),
    );
  });

  it('executes a list request with selected state filter when state filter is changed', async () => {
    const { getByText } = render(<Resources />);

    await wait(() => expect(mockedAxios.get).toHaveBeenCalled());

    selectOption(getByText(labelUnhandledProblems), labelResourceProblems);

    await wait(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'monitoring/resources?state=["resources_problems"]',
        cancelTokenRequestParam,
      ),
    );

    selectOption(getByText(labelResourceProblems), labelAll);

    await wait(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'monitoring/resources?state=["all"]',
        cancelTokenRequestParam,
      ),
    );
  });

  it('sends a listing request with sort_by param when a sortable column is clicked', async () => {
    const { getByText } = render(<Resources />);

    await wait(() => {
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    columns
      .filter(({ sortable }) => sortable !== false)
      .forEach(({ id, label }) => {
        fireEvent.click(getByText(label));

        expect(mockedAxios.get).toHaveBeenCalledWith(
          getEndpoint({ sortBy: id, sortOrder: 'desc' }),
          cancelTokenRequestParam,
        );

        fireEvent.click(getByText(label));

        expect(mockedAxios.get).toHaveBeenCalledWith(
          getEndpoint({ sortBy: id, sortOrder: 'asc' }),
          cancelTokenRequestParam,
        );
      });
  });

  it('sends a listing request with an updated page param when a change page action is clicked', async () => {
    const { getByLabelText } = render(<Resources />);

    await wait(() => {
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    fireEvent.click(getByLabelText('Next Page'));

    expect(mockedAxios.get).toHaveBeenLastCalledWith(
      getEndpoint({ page: 2 }),
      cancelTokenRequestParam,
    );

    fireEvent.click(getByLabelText('Previous Page'));

    expect(mockedAxios.get).toHaveBeenLastCalledWith(
      getEndpoint({ page: 1 }),
      cancelTokenRequestParam,
    );

    fireEvent.click(getByLabelText('Last Page'));

    expect(mockedAxios.get).toHaveBeenLastCalledWith(
      getEndpoint({ page: 4 }),
      cancelTokenRequestParam,
    );

    fireEvent.click(getByLabelText('First Page'));

    expect(mockedAxios.get).toHaveBeenLastCalledWith(
      getEndpoint({ page: 1 }),
      cancelTokenRequestParam,
    );
  });
});