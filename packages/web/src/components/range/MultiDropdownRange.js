import React, { Component } from "react";
import { connect } from "react-redux";

import {
	addComponent,
	removeComponent,
	watchComponent,
	updateQuery
} from "@appbaseio/reactivecore/lib/actions";
import {
	getQueryOptions,
	pushToAndClause,
	checkValueChange,
	getAggsOrder,
	checkPropChange,
	checkSomePropChange
} from "@appbaseio/reactivecore/lib/utils/helper";

import types from "@appbaseio/reactivecore/lib/utils/types";

import Title from "../../styles/Title";
import Dropdown from "../shared/Dropdown";

class MultiDropdownRange extends Component {
	constructor(props) {
		super(props);

		this.state = {
			currentValue: [],
			showModal: false
		};

		// selectedValues hold the selected items as keys for O(1) complexity
		this.selectedValues = {};
		this.type = "range";
	}

	componentWillMount() {
		this.props.addComponent(this.props.componentId);
		this.setReact(this.props);

		if (this.props.defaultSelected) {
			this.selectItem(this.props.defaultSelected, true);
		}
	}

	componentWillReceiveProps(nextProps) {
		checkPropChange(
			this.props.react,
			nextProps.react,
			() => this.setReact(nextProps)
		);

		if (this.props.defaultSelected !== nextProps.defaultSelected) {
			this.selectItem(nextProps.defaultSelected, true);
		} else if (this.state.currentValue !== nextProps.selectedValue
			&& (nextProps.selectedValue || nextProps.selectedValue === null)) {
			this.selectItem(nextProps.selectedValue, true);
		}
	}

	componentWillUnmount() {
		this.props.removeComponent(this.props.componentId);
	}

	setReact(props) {
		if (props.react) {
			props.watchComponent(props.componentId, props.react);
		}
	}

	defaultQuery = (values, props) => {
		const generateRangeQuery = (dataField, items) => {
			if (items.length > 0) {
				return items.map(value => ({
					range: {
						[dataField]: {
							gte: value.start,
							lte: value.end,
							boost: 2.0
						}
					}
				}));
			}
		};

		if (values && values.length) {
			const query = {
				bool: {
					should: generateRangeQuery(props.dataField, values),
					minimum_should_match: 1,
					boost: 1.0
				}
			};
			return query;
		}
		return null;
	}

	selectItem = (item, isDefaultValue = false, props = this.props) => {
		let { currentValue } = this.state;

		if (!item) {
			currentValue = [];
			this.selectedValues = {};
		} else if (isDefaultValue) {
			// checking if the items in defaultSeleted exist in the data prop
			currentValue = props.data.filter(value => item.includes(value.label));
			currentValue.forEach(value => {
				this.selectedValues = { ...this.selectedValues, [value.label]: true };
			});
		} else {
			if (this.selectedValues[item.label]) {
				currentValue = currentValue.filter(value => value.label !== item.label);
				const { [item.label]: del, ...selectedValues } = this.selectedValues;
				this.selectedValues = selectedValues;
			} else {
				currentValue = [...currentValue, item];
				this.selectedValues = { ...this.selectedValues, [item.label]: true };
			}
		}
		const performUpdate = () => {
			this.setState({
				currentValue
			}, () => {
				this.updateQuery(currentValue, props);
			});
		}

		checkValueChange(
			props.componentId,
			currentValue,
			props.beforeValueChange,
			props.onValueChange,
			performUpdate
		);
	}

	toggleModal = () => {
		this.setState({
			showModal: !this.state.showModal
		})
	};

	updateQuery = (value, props) => {
		const query = props.customQuery || this.defaultQuery;
		let callback = null;

		let onQueryChange = null;
		if (props.onQueryChange) {
			onQueryChange = props.onQueryChange;
		}

		props.updateQuery({
			componentId: props.componentId,
			query: query(value, props),
			value,
			label: props.filterLabel,
			showFilter: props.showFilter,
			onQueryChange,
			URLParams: props.URLParams
		});
	}

	render() {
		return (
			<div>
				{this.props.title && <Title>{this.props.title}</Title>}
				<Dropdown
					items={this.props.data}
					onChange={this.selectItem}
					selectedItem={this.state.currentValue}
					placeholder={this.props.placeholder}
					keyField="label"
					multi
					returnsObject
				/>
			</div>
		);
	}
}

MultiDropdownRange.propTypes = {
	addComponent: types.addComponent,
	componentId: types.componentId,
	defaultSelected: types.stringArray,
	react: types.react,
	removeComponent: types.removeComponent,
	data: types.data,
	dataField: types.dataField,
	customQuery: types.customQuery,
	beforeValueChange: types.beforeValueChange,
	onValueChange: types.onValueChange,
	onQueryChange: types.onQueryChange,
	updateQuery: types.updateQuery,
	supportedOrientations: types.supportedOrientations,
	placeholder: types.placeholder,
	selectedValue: types.selectedValue,
	title: types.title
}

MultiDropdownRange.defaultProps = {
	placeholder: "Select a value"
}

const mapStateToProps = (state, props) => ({
	selectedValue: state.selectedValues[props.componentId] ? state.selectedValues[props.componentId].value : null
});

const mapDispatchtoProps = dispatch => ({
	addComponent: component => dispatch(addComponent(component)),
	removeComponent: component => dispatch(removeComponent(component)),
	watchComponent: (component, react) => dispatch(watchComponent(component, react)),
	updateQuery: (updateQueryObject) => dispatch(updateQuery(updateQueryObject))
});

export default connect(mapStateToProps, mapDispatchtoProps)(MultiDropdownRange);