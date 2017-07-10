import SortDirection from 'react-virtualized/dist/commonjs/Table/SortDirection';

import RenderData from '~/renderers/renderData';

import BaseTable from './base';

export default function sortableTable(Table) {
  return class SortableTable extends BaseTable {
    static propTypes = {
      initialSort: React.PropTypes.shape({
        sortBy: React.PropTypes.string,
        sortDirection: React.PropTypes.string
      }),
      onSort: React.PropTypes.func,
      sortBy: React.PropTypes.string,
      sortDirection: React.PropTypes.string
    };

    static defaultProps = {
      ...BaseTable.defaultProps,
      initialSort: {}
    };

    constructor(props) {
      super(props);

      this.state = this.createInitialState();
    }

    createInitialState() {
      return {
        sortBy: this.props.initialSort.sortBy,
        sortDirection: this.props.initialSort.sortDirection
      };
    }

    onSort = props => {
      if (this.props.onSort) {
        this.props.onSort(props);
      } else {
        if (this.state.sortBy == this.props.sortBy &&
            this.state.sortDirection == SortDirection.DESC) {
          this.setState(this.createInitialState());
        } else {
          this.setState(props);
        }
      }
    }

    doSort() {
      return !!this.getSortBy();
    }

    getSortBy() {
      return this.props.sortBy || this.state.sortBy;
    }

    getSortDirection() {
      return this.props.sortDirection || this.state.sortDirection;
    }

    getColumnProps = getter => {
      return column => ({
        ...getter(column),
        sortable: column.isSortable
      });
    }

    rowsModifier = rows => {
      const columnProps = this.props.columns
        .map(column => column.getTableProps())
        .find(columnProps => columnProps.label == this.getSortBy());

      const renderData = new RenderData(this.props.dataType, null);
      const getSortValue = function(row) {
        renderData.dataValue = row;
        return columnProps.viewType.getValue(renderData);
      };

      return rows
        .update(models => this.doSort() ?
          models
            .sortBy(getSortValue, (a, b) => {
              // TODO: Put sort in the column props like filter is?
              const nullA = (a === null || typeof a == 'undefined');
              const nullB = (b === null || typeof b == 'undefined');
              if (nullA && nullB) {
                return 0;
              } else if (nullA) {
                return 1;
              } else if (nullB) {
                return -1;
              } else {
                return a > b ? 1 : a < b ? -1 : 0;
              }
            })
            .update(models =>
                this.getSortDirection() == SortDirection.DESC ?
                  models.reverse() :
                  models
            ) :
          models
        );
    }

    render() {
      const mergedProps = this.mergeProps({
        getColumnProps: this.getColumnProps,
        rowsModifier: this.rowsModifier,
        sort: this.onSort,
        sortBy: this.getSortBy(),
        sortDirection: this.getSortDirection()
      });

      return <Table
        ref={table => this.table = table}
        {...mergedProps}
      />;
    }
  }
}

