/*!
Copyright 2015 ManyWho, Inc.
Licensed under the ManyWho License, Version 1.0 (the "License"); you may not use this
file except in compliance with the License.
You may obtain a copy of the License at: http://manywho.com/sharedsource
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied. See the License for the specific language governing
permissions and limitations under the License.
*/

(function (manywho) {

    var vertical = React.createClass({

        mixins: [manywho.component.mixins.collapse],

        render: function () {

            manywho.log.info('Rendering Vertical: ' + this.props.id);

            var model = manywho.model.getContainer(this.props.id, this.props.flowKey);
            var outcomes = manywho.model.getOutcomes(this.props.id, this.props.flowKey);

            var classes = manywho.styling.getClasses(this.props.parentId, this.props.id, "vertical_flow", this.props.flowKey);
            var childClasses = ['clearfix'];

            if (manywho.settings.flow('collapsible', this.props.flowKey)) {

                this.state.isVisible ? childClasses.push('collapsible-container') : childClasses.push('collapsible-container', 'collapsed-container');

            }

            var children = manywho.model.getChildren(this.props.id, this.props.flowKey);

            var outcomeButtons = outcomes && outcomes.map(function (outcome) {
                return React.createElement(manywho.component.getByName('outcome'), { id: outcome.id, flowKey: this.props.flowKey });
            }, this);

            return React.DOM.div({ className: classes.join(' '), id: this.props.id }, [
                this.getLabel(model.label),
                React.DOM.div({ className: childClasses.join(' '), style: { height: this.state.height} }, [
                    this.props.children || manywho.component.getChildComponents(children, this.props.id, this.props.flowKey)
                ]),
                outcomeButtons
            ]);

        }

    });

    manywho.component.register('vertical_flow', vertical, ['mw-vertical_flow']);

    manywho.styling.registerContainer("vertical_flow", function (item, container) {

        var classes = [];

        if (manywho.utils.isEqual(item.componentType, 'input', true)
            && item.size == 0
            && (manywho.utils.isEqual(item.contentType, manywho.component.contentTypes.string, true)
            || manywho.utils.isEqual(item.contentType, manywho.component.contentTypes.password, true)
            || manywho.utils.isEqual(item.contentType, manywho.component.contentTypes.number, true))) {

            classes.push('auto-width');

        }

        return classes;

    });

}(manywho));
