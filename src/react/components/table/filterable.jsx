import {List, Map} from 'immutable';
import DebounceInput from 'react-debounce-input';
import ImmutablePropTypes from 'react-immutable-proptypes';

import RenderData from '~/renderers/renderData';
import reactRenderers from '~/react/renderers';

import BaseTable from './base';

class InputDebounce extends React.Component {
  constructor(props) {
    super(props);

    this.state = this.createInitialState(props);
    this.callbackTimer = null;
  }

  createInitialState(props) {
    return {
      renderData: new RenderData(
        props.renderData.dataType,
        props.renderData.dataValue,
        props.renderData.options
      )
    };
  }

  componentWillReceiveProps(newProps) {
    if (newProps.renderData.dataValue != this.props.renderData.dataValue) {
      this.onChange(newProps.renderData.dataValue);
    }
  }

  onChange = (value) => {
    const renderData = this.state.renderData;
    renderData.dataValue = value;
    this.setState({renderData});

    clearTimeout(this.callbackTimer);
    this.callbackTimer = setTimeout(() => {
      const {onChange} = this.props.renderData.options;
      onChange(this.state.renderData.dataValue);
    }, 500);
  }

  onBlur = () => {
    clearTimeout(this.callbackTimer);
    if (this.state.renderData.dataValue != this.props.renderData.dataValue) {
      const {onChange} = this.props.renderData.options;
      onChange(this.state.renderData.dataValue);
    }
  }

  render() {
    const subRenderData = new RenderData(
      this.state.renderData.dataType,
      this.state.renderData.dataValue,
      {
        onChange: this.onChange,
        onBlur: this.onBlur
      }
    );

    return (
      <div
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        {reactRenderers.renderFilter(
          this.props.viewType,
          subRenderData
        )}
      </div>
    );
  }
}

export default function filterableTable(Table) {
  return class FilterableTable extends BaseTable {
    static propTypes = {
      showFilterButton: React.PropTypes.bool,
      showFilterFields: React.PropTypes.bool,
      filtering: React.PropTypes.bool,
      onFilter: React.PropTypes.func,
      filters: ImmutablePropTypes.mapOf(
        React.PropTypes.any.isRequired,
        React.PropTypes.string.isRequired
      )
    }

    static defaultProps = {
      ...BaseTable.defaultProps,
      showFilterButton: true,
      showFilterFields: true
    }

    constructor(props) {
      super(props);
      this.toggleFilter = this.toggleFilter.bind(this);

      this.state = this.createInitialState();
    }

    createInitialState() {
      return {
        filtering: false,
        filters: Map()
      };
    }

    toggleFilter() {
      if (this.state.filtering) {
        this.setState(this.createInitialState());
      } else {
        this.setState({filtering: true});
      }
    }

    onFilterChange(columnProps) {
      return filterValue => {
        this.props.onFilter ?
          this.props.onFilter(columnProps, filterValue) :
          this.onFilter(columnProps, filterValue);
      };
    }

    getHeaderRowHeight = height => {
      return height + 41;
    }

    headerRowRenderer = renderer => {
      return props => renderer({
        ...props,
        extraHeaderRowHeight: 41
      });
    }

    headerRenderer = renderer => {
      return (column, props) => <div>
        {renderer(column, props)}
        {this.inputFilterRenderer(column)}
      </div>;
    }

    getToolbarButtons = buttons => {
      if (this.props.showFilterButton) {
        return buttons
          .push(<button
            key='filter-toggle'
            type='button'
            className='formatron-table-button formatron-table-filterable-filter'
            onClick={this.toggleFilter}
          >
            Filter
          </button>);
      } else {
        return buttons;
      }
    }

    // This function needs to be optimized for performance reasons since it
    // is performing string / other value matching on potentially large numbers
    // of rows.
    rowsModifier = rows => {
      const columnsProps = this.props.columns
        .map(column => column.getTableProps());

      const filters = this.getFilters()
        .map((filterValue, label) => [
          filterValue,
          columnsProps.find(columnProps => columnProps.label == label)
        ])
        .filter(([filterValue, columnProps]) => !!columnProps)
        .toList()
        .toArray();

      const renderData = new RenderData(this.props.dataType, null);

      return List()
        .withMutations(newRows => {
          // TODO: Maybe move this function out of the react specific code and
          // into some generic filtering code.
          for (let rowIndex = 0; rowIndex < rows.size; rowIndex++) {
            const row = rows.get(rowIndex);
            let matches = true;

            for (let filterIndex = 0; filterIndex < filters.length; filterIndex++) {
              const [filterValue, columnProps] = filters[filterIndex];

              renderData.dataValue = row;
              const rowValue = columnProps.viewType.getValue(renderData);

              if (typeof filterValue == 'function') {
                if (!filterValue(rowValue, row)) {
                  matches = false;
                  break;
                }
              } else if (rowValue !== null && typeof rowValue != 'undefined') {
                if (Array.isArray(filterValue)) {
                  if (!filterValue.some(filterValue => columnProps.filter(filterValue, rowValue, this.props.dataType))) {
                    matches = false;
                    break;
                  }
                } else {
                  if (!columnProps.filter(filterValue, rowValue, this.props.dataType)) {
                    matches = false;
                    break;
                  }
                }
              } else {
                matches = false;
                break;
              }
            }

            if (matches) {
              newRows.push(row);
            }
          }
        });
    }

    inputFilterRenderer(column) {
      const columnProps = column.getTableProps();

      if (!columnProps.label) {
        return null;
      }

      const dataType = column.getRef ?
        this.props.dataType.getField(column.getRef()) :
        null;
      const dataValue = this.getFilters().get(columnProps.label, '');
      const renderData = new RenderData(dataType, dataValue, {
        onChange: this.onFilterChange(columnProps)
      });

      return <InputDebounce viewType={column} renderData={renderData} debounce={400} />;
    }

    isFiltering() {
      return this.props.filtering || this.state.filtering;
    }

    getFilters() {
      return this.props.filters || this.state.filters;
    }

    onFilter(columnProps, filterValue) {
      const removeFilter = typeof filterValue == 'undefined' ||
        filterValue === null ||
        filterValue === '' ||
        (Array.isArray(filterValue) && filterValue.length == 0);

      const filters = removeFilter ? (
        this.state.filters
          .remove(columnProps.label)
      ) : (
        this.state.filters
          .set(columnProps.label, filterValue)
      );

      this.setState({filters});
    }

    render() {
      if (this.isFiltering()) {
        const newProps = this.props.showFilterFields ? {
          getHeaderRowHeight: this.getHeaderRowHeight,
          headerRowRenderer: this.headerRowRenderer,
          headerRenderer: this.headerRenderer,
          getToolbarButtons: this.getToolbarButtons,
          rowsModifier: this.rowsModifier
        } : {
          getToolbarButtons: this.getToolbarButtons,
          rowsModifier: this.rowsModifier
        };

        const mergedProps = this.mergeProps(newProps);

        return <Table
          ref={table => this.table = table}
          {...mergedProps}
        />;
      } else {
        return <Table
          ref={table => this.table = table}
          {...this.mergeProps({
            getToolbarButtons: this.getToolbarButtons
          })}
        />;
      }
    }
  };
}

