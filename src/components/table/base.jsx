import {List, Map} from 'immutable';
import React, {PureComponent} from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';

const renderersPropType = ImmutablePropTypes.listOf(
  React.PropTypes.func.isRequired
);

export default class BaseTable extends PureComponent {
  static naturalIndex = Symbol('naturalIndex')

  static defaultProps = {
    columnsRenderers: List(),
    columnRenderers: List(),
    getColumnProps: List(),
    headerRowRenderers: List(),
    getToolbarButtons: List(),
    rowsModifiers: List(),
    rowGetters: List(),
    rowRenderers: List(),
    noRowsRenderers: List(),
    cellRenderers: List(),
    headerRenderers: List(),

    models: List()
  }

  static propTypes = {
    columnsRenderers: renderersPropType,
    columnRenderers: renderersPropType,
    getColumnProps: renderersPropType,
    getToolbarButtons: renderersPropType,
    rowsModifiers: renderersPropType,
    rowGetters: renderersPropType,
    rowRenderers: renderersPropType,
    noRowsRenderers: renderersPropType,
    cellRenderers: renderersPropType,
    headerRenderers: renderersPropType,

    className: React.PropTypes.string,
    // TODO: Make a schema proptype
    schema: React.PropTypes.object.isRequired,
    models: ImmutablePropTypes.listOf(
      ImmutablePropTypes.map.isRequired
    ),
    loading: React.PropTypes.bool
  }

  forceUpdateGrid() {
    return this.table && this.table.forceUpdateGrid();
  }

  mergeProps(newProps) {
    const propNames = {
      columnsRenderer: 'columnsRenderers',
      columnRenderer: 'columnRenderers',
      getColumnProps: 'getColumnProps',
      getToolbarButtons: 'getToolbarButtons',
      headerRowRenderer: 'headerRowRenderers',
      rowsModifier: 'rowsModifiers',
      rowGetter: 'rowGetters',
      rowRenderer: 'rowRenderers',
      noRowsRenderer: 'noRowsRenderers',
      cellRenderer: 'cellRenderers',
      headerRenderer: 'headerRenderers'
    };

    return {
      ...this.props,
      ...Map(newProps)
        .mapEntries(([key, value]) => propNames[key] ? [
          propNames[key],
          this.props[propNames[key]].push(value)
        ] : [
          key,
          value
        ])
        .toObject()
    };
  }
};

