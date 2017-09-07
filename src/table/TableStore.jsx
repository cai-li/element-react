// @flow
import * as React from 'react';
import { Component, PropTypes } from '../../libs';

import type {
  TableProps,
  TableStoreState,
  Column,
} from './Types';
import normalizeColumns from './normalizeColumns';
import { flattenColumns } from "./utils";


export default function TableStoreHOC(WrapedComponent: React.ComponentType<any>): React.ComponentType<any> {
  return class TableStore extends Component<TableProps, TableStoreState> {
    static defaultProps = {
      showHeader: true,
      fit: true,
      emptyText: '暂无数据',
    };

    static childContextTypes = {
      store: PropTypes.any,
    };

    getChildContext(): Object {
      return {
        store: this,
      }
    }

    constructor(props) {
      super(props);

      this.state = {
        _columns: null, // transformed columns props
        fixedColumns: null, // left fixed columns from _columns
        rightFixedColumns: null, // right fixed columns from _columns
        originColumns: null, // _columns sorted by 'fixed'
        columns: null, // contain only leaf column
        isComplex: null, // has fixed column
        expandingRows: [], // expanding rows
        hoverRow: null,
        rowKey: props.rowKey,
        defaultExpandAll: props.defaultExpandAll,
        currentRow: null,
      };
    }

    componentWillMount() {
      const { columns, data } = this.props;
      this.updateColumns(columns);
      this.setData(data);
    }

    componentWillReceiveProps(nextProps) {
      const { columns, data, highlightCurrentRow, currentRowKey } = this.props;
      if (columns !== nextProps.columns) {
        this.updateColumns(nextProps.columns);
      }

      if (data !== nextProps.data) {
        this.setData(nextProps.data);
      }

    }

    // shouldComponentUpdate(nextProps) {
    //   const propsKeys = Object.keys(this.props);
    //   const nextPropsKeys = Object.keys(nextProps);
    //
    //   if (propsKeys.length !== nextPropsKeys.length) {
    //     return true;
    //   }
    //   for (const key of propsKeys) {
    //     if (this.props[key] !== nextProps[key]) {
    //       return true;
    //     }
    //   }
    //   return false;
    // }

    updateColumns(columns) {
      const _columns = normalizeColumns(columns);
      if (_columns[0].type === 'selection' && !_columns[0].fixed) { // 首列为多选列强制固定
        _columns[0].fixed = true;
      }
      const fixedColumns = _columns.filter(column => column.fixed === true || column.fixed === 'left');
      const rightFixedColumns = _columns.filter(column => column.fixed === 'right');
      const originColumns = [].concat(fixedColumns, _columns.filter(column => !column.fixed), rightFixedColumns);

      this.setState({
        _columns,
        fixedColumns,
        rightFixedColumns,
        originColumns,
        columns: flattenColumns(_columns),
        isComplex: fixedColumns.length > 0 || rightFixedColumns.length > 0
      });
    }

    setData(_data: Array<Object>) {
      // todo more
      this.setState({
        _data,
        data: _data,
        hoverRow: null,
        expandingRows: [],
        currentRow: null,
      });
    }

    setHoverRow(index: number) {
      if (!this.state.isComplex) return;
      // todo optimize
      // clearTimeout(this.clearHoverTimer);
      // if (index === null) {
      //   this.clearHoverTimer = setTimeout(() => {
      //     this.setState({
      //       hoverRow: index
      //     });
      //   }, 300);
      //   return;
      // }
      this.setState({
        hoverRow: index
      });
    }

    toggleRowExpanded(row: Object, rowKey: string | number) {
      const { expand, expandRowKeys } = this.props;
      const { expandingRows } = this.state;
      if (expandRowKeys) { // controlled expanding status
        const isRowExpanding = expandRowKeys.includes(rowKey);
        expand && expand(row, !isRowExpanding);
        return;
      }

      const rowIndex = expandingRows.indexOf(row);
      if (rowIndex > -1) {
        expandingRows.splice(rowIndex, 1);
      } else {
        expandingRows.push(row);
      }

      this.setState({
        expandingRows
      }, () => {
        expand && expand(row, rowIndex === -1);
      });
    }

    isRowExpanding(row: Object, rowKey: string | number) {
      const { expandRowKeys } = this.props;
      const { expandingRows } = this.state;

      if (expandRowKeys) {
        return expandRowKeys.includes(rowKey);
      }
      return expandingRows.includes(row);
    }

    setCurrentRow(row: Object) {
      const { highlightCurrentRow, currentRowKey } = this.props;
      if (!highlightCurrentRow || currentRowKey) return;

      this.setState({
        currentRow: row
      });
    }

    render()  {
      const renderExpanded = (this.props.columns.find(column => column.type === 'expand') || {}).expandPannel;
      return (
        <WrapedComponent
          {...this.props}
          renderExpanded={renderExpanded}
          store={this.state}
        />
      )
    }
  }
}