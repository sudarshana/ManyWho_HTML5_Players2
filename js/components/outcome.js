(function (manywho) {

    function getButtonType(action) {

        if (!manywho.utils.isNullOrWhitespace(action)) {

            switch (action.toLowerCase()) {
                case 'save':
                    return 'btn-primary';
                case 'edit':
                    return 'btn-info';
                case 'delete':
                    return 'btn-danger';
                default:
                    return 'btn-default';
            }

        }

        return 'btn-default';

    }

    var outcome = React.createClass({

        render: function () {

            log.info('Rendering Outcome: ' + this.props.id);

            var model = manywho.model.getOutcome(this.props.id);

            var classes = [
                'outcome btn',
                getButtonType(model.pageActionBindingType),
                (model.pageActionBindingType) ? 'btn-sm' : ''
            ].join(' ');

            return React.DOM.button({
                className: classes,
                onClick: function (event) {

                    manywho.engine.move(model);
                }

            }, model.label);

        }

    });

    manywho.component.register('outcome', outcome);

}(manywho));