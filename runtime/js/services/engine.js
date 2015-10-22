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

manywho.engine = (function (manywho) {

    function processObjectDataRequests(components, flowKey) {

        if (components) {

            var requestComponents = manywho.utils.convertToArray(components).filter(function (component) {

                return component.objectDataRequest != null || component.fileDataRequest != null;

            });

            return $.when.apply($, requestComponents.map(function (component) {

                var limit = manywho.settings.global('paging.' + component.componentType);

                if (component.fileDataRequest) {

                    return manywho.engine.fileDataRequest(component.id, component.fileDataRequest, flowKey, limit);

                }
                else {

                    return manywho.engine.objectDataRequest(component.id, component.objectDataRequest, flowKey, limit);

                }

            }));

        }

    }

    function isAuthorized(response, flowKey) {

        if (!manywho.authorization.isAuthorized(response, flowKey)) {

            return $.Deferred().reject(response).promise();

        }

        return response;

    }

    function onAuthorizationFailed(response, flowKey, callback) {

        if (manywho.state.getSessionData(flowKey) != null) {

            manywho.authorization.authorizeBySession(response.authorizationContext.loginUrl, flowKey, callback);

        } else {

            // Authorization failed, retry
            manywho.authorization.invokeAuthorization(response, flowKey, callback);

        }

    }

    function loadNavigation(flowKey, stateToken, navigationId, currentMapElementId) {

        if (navigationId) {

            return manywho.ajax.getNavigation(manywho.utils.extractStateId(flowKey), stateToken, navigationId, manywho.utils.extractTenantId(flowKey))
                    .then(function (navigation) {

                        if (navigation) {

                            manywho.model.parseNavigationResponse(navigationId, navigation, flowKey, currentMapElementId);

                        }

                    });

        }

        var deferred = new $.Deferred();
        deferred.resolve();
        return deferred;

    }

    function loadExecutionLog(flowKey, authenticationToken) {

        return manywho.ajax.getExecutionLog(manywho.utils.extractTenantId(flowKey), manywho.utils.extractFlowId(flowKey), manywho.utils.extractStateId(flowKey), authenticationToken)
                .then(function (executionLog) {

                    if (executionLog) {

                        manywho.model.setExecutionLog(flowKey, executionLog);

                    }

                });

    }

    function notifyError(flowKey, response) {

        if (response) {

            manywho.model.addNotification(flowKey, {
                message: response.responseText,
                position: 'center',
                type: 'danger',
                timeout: '0',
                dismissible: true
            });

        }

    }

    function onInitializeFailed(response) {

        var container = document.querySelector(manywho.settings.global('containerSelector', null, '#manywho'))
        container.classList.add('mw-bs');

        var alert = document.createElement('div');
        alert.className = 'alert alert-danger initialize-error';
        alert.innerText = response.statusText;

        container.insertBefore(alert, container.children[0]);

        return response;

    }

    function initializeWithAuthorization(callback, tenantId, flowId, flowVersionId, container, options, authenticationToken) {

        var self = this;
        var flowKey = callback.flowKey;
        var stateId = (flowKey) ? manywho.utils.extractStateId(flowKey) : null;
        var navigationId, streamId = null;

        var initializationRequest = manywho.json.generateInitializationRequest(
            { id: flowId, versionId: flowVersionId },
            stateId,
            options.annotations,
            options.inputs,
            manywho.settings.global('playerUrl'),
            manywho.settings.global('joinUrl'),
            options.mode,
            options.reportingMode
        );

        if (flowKey) {

            manywho.state.setComponentLoading(manywho.utils.extractElement(flowKey), { message: manywho.settings.global('localization.initializing') }, flowKey);
            self.render(flowKey);

            authenticationToken = authenticationToken || manywho.state.getAuthenticationToken(flowKey);

        }

        return manywho.ajax.initialize(initializationRequest, tenantId, authenticationToken)
            .then(function (response) {

                localStorage.setItem('oauth-' + response.stateId, JSON.stringify({
                    tenantId: tenantId,
                    flowId: flowId,
                    flowVersionId: flowVersionId,
                    container: container,
                    options: options
                }));

                flowKey = manywho.utils.getFlowKey(tenantId, flowId, flowVersionId, response.stateId, container);

                if (options.callbacks != null && options.callbacks.length > 0) {

                    options.callbacks.forEach(function (callback) {
                        manywho.callbacks.register(flowKey, callback);
                    });

                }

                streamId = response.currentStreamId;

                callback.flowKey = flowKey;

                manywho.model.initializeModel(flowKey);
                manywho.settings.initializeFlow(options, flowKey);
                manywho.state.setState(response.stateId, response.stateToken, response.currentMapElementId, flowKey);
                manywho.state.setAuthenticationToken(authenticationToken, flowKey);

                if (options.authentication != null && options.authentication.sessionid != null) {

                    manywho.state.setSessionData(options.authentication.sessionid, options.authentication.sessionurl, flowKey);

                }

                if (response.navigationElementReferences && response.navigationElementReferences.length > 0) {

                    manywho.model.setSelectedNavigation(response.navigationElementReferences[0].id, flowKey);

                }

                if (!manywho.utils.isNullOrWhitespace(options['navigationelementid'])) {

                    manywho.model.setSelectedNavigation(options['navigationelementid'], flowKey);

                }

                manywho.component.appendFlowContainer(flowKey);
                manywho.state.setComponentLoading(manywho.utils.extractElement(flowKey), { message: manywho.settings.global('localization.initializing') }, flowKey);
                self.render(flowKey);

                return isAuthorized(response, flowKey);

            }, onInitializeFailed)
            .then(function (response) {

                var invokeRequest = manywho.json.generateInvokeRequest(
                    manywho.state.getState(flowKey),
                    'FORWARD',
                    null,
                    null,
                    navigationId,
                    manywho.settings.flow('annotations', flowKey),
                    manywho.state.getLocation(flowKey),
                    manywho.settings.flow('mode', flowKey)
                );

                return manywho.ajax.invoke(invokeRequest, manywho.utils.extractTenantId(flowKey), manywho.state.getAuthenticationToken(flowKey));

            }, function (response) {

                onAuthorizationFailed(response, flowKey, callback);

            })
            .then(function (response) {

                localStorage.removeItem('oauth-' + response.stateId);

                self.parseResponse(response, manywho.model.parseEngineResponse, flowKey);

                manywho.state.setState(response.stateId, response.stateToken, response.currentMapElementId, flowKey);

                manywho.collaboration.initialize(manywho.settings.flow('collaboration.isEnabled', flowKey), flowKey);
                manywho.collaboration.join('Another user', flowKey);

                manywho.state.setLocation(flowKey);

                var deferreds = [];

                var navigationId = manywho.model.getSelectedNavigation(flowKey);

                if (!manywho.utils.isNullOrWhitespace(navigationId)) {

                    deferreds.push(loadNavigation(flowKey, response.stateToken, navigationId, response.currentMapElementId));

                }

                if (manywho.settings.isDebugEnabled(flowKey)) {

                    deferreds.push(loadExecutionLog(flowKey, authenticationToken));

                }

                if (streamId) {

                    manywho.social.initialize(flowKey, response.currentStreamId);

                }

                return $.whenAll(deferreds);

            }, function(response) {

                notifyError(flowKey, response);

            })
            .always(function () {

                self.render(flowKey);
                processObjectDataRequests(manywho.model.getComponents(flowKey), flowKey);

            })
            .always(function() {

                manywho.state.setComponentLoading(manywho.utils.extractElement(flowKey), null, flowKey);
                self.render(flowKey);

             })
             .then(function() {

                return flowKey;

             });

    }

    function joinWithAuthorization(callback, flowKey) {

        var self = this;
        var flowKey = flowKey || callback.flowKey;
        var authenticationToken = manywho.state.getAuthenticationToken(flowKey);
        var state = manywho.state.getState(flowKey);
        var isAuthenticated = false;

        manywho.state.setComponentLoading(manywho.utils.extractElement(flowKey), { message: manywho.settings.global('localization.joining') }, flowKey);
        self.render(flowKey);

        return manywho.ajax.join(state.id, manywho.utils.extractTenantId(flowKey), authenticationToken)
            .then(function (response) {

                return isAuthorized(response, flowKey);

            }, onInitializeFailed)
            .then(function (response) {

                isAuthenticated = true;
                localStorage.removeItem('oauth-' + response.stateId);

                manywho.model.initializeModel(flowKey);
                self.parseResponse(response, manywho.model.parseEngineResponse, flowKey);

                manywho.state.setState(response.stateId, response.stateToken, response.currentMapElementId, flowKey);

                if (!manywho.collaboration.isInitialized(flowKey)) {

                    manywho.collaboration.initialize(manywho.settings.flow('collaboration.isEnabled', flowKey), flowKey);
                    manywho.collaboration.join('Another user', flowKey);

                }

                manywho.state.setLocation(flowKey);

                var deferreds = [];

                if (response.navigationElementReferences && response.navigationElementReferences.length > 0) {

                    manywho.model.setSelectedNavigation(response.navigationElementReferences[0].id, flowKey);
                    deferreds.push(loadNavigation(flowKey, response.stateToken, response.navigationElementReferences[0].id, response.currentMapElementId));

                }

                if (manywho.settings.isDebugEnabled(flowKey)) {

                    deferreds.push(loadExecutionLog(flowKey, authenticationToken));

                }

                if (response.currentStreamId) {

                    manywho.social.initialize(flowKey, response.currentStreamId);

                }

                return $.whenAll(deferreds);

            }, function (response) {

                onAuthorizationFailed(response, flowKey, callback);

            })
            .always(function () {

                if (isAuthenticated) {

                    self.render(flowKey);
                    return processObjectDataRequests(manywho.model.getComponents(flowKey), flowKey);

                }

            })
            .always(function () {

                if (isAuthenticated) {

                    manywho.state.setComponentLoading(manywho.utils.extractElement(flowKey), null, flowKey);
                    self.render(flowKey);

                }

            })
            .then(function() {

                return flowKey;

            });

    }

    function moveWithAuthorization(callback, invokeRequest, flowKey) {

        var self = this;
        var flowKey = callback.flowKey || flowKey;
        var authenticationToken = manywho.state.getAuthenticationToken(flowKey);
        var moveResponse = null;

        return manywho.ajax.invoke(invokeRequest, manywho.utils.extractTenantId(flowKey), authenticationToken)
            .then(function (response) {

                return isAuthorized(response, flowKey);

            }, function(response) {

                notifyError(flowKey, response);

            })
            .then(function (response) {

                moveResponse = response;

                self.parseResponse(response, manywho.model.parseEngineResponse, flowKey);

                manywho.state.setState(response.stateId, response.stateToken, response.currentMapElementId, flowKey);
                manywho.state.setLocation(flowKey);

                if (manywho.collaboration.isInitialized(flowKey)) {

                    manywho.collaboration.move(flowKey);

                }

                return response;

            }, function (response) {

                manywho.authorization.invokeAuthorization(response, flowKey, callback);

            })
            .then(function (response) {

                var selectedNavigationId = manywho.model.getSelectedNavigation(flowKey);

                var deferreds = [];

                if (!manywho.utils.isNullOrWhitespace(selectedNavigationId)) {

                    deferreds.push(loadNavigation(flowKey, moveResponse.stateToken, selectedNavigationId));

                }
                if (manywho.settings.isDebugEnabled(flowKey)) {

                    deferreds.push(loadExecutionLog(flowKey, authenticationToken));

                }

                return $.whenAll(deferreds);

            })
            .always(function () {

                self.render(flowKey);

                manywho.component.focusInput(flowKey);
                manywho.component.scrollToTop(flowKey);

            })
            .always(function() {

                manywho.state.setComponentLoading(manywho.utils.extractElement(flowKey), null, flowKey);
                self.render(flowKey);

            })
            .always(function () {

                return processObjectDataRequests(manywho.model.getComponents(flowKey), flowKey);

            })
            .then(function() {

                if (moveResponse) {

                    manywho.callbacks.execute(flowKey, moveResponse.invokeType, null, [moveResponse]);
                    moveResponse = null;
                }

            });

    }

    return {

        initialize: function(tenantId, flowId, flowVersionId, container, stateId, authenticationToken, options, isInitializing) {

            options = options || {};
            isInitializing = (isInitializing) ? (isInitializing.toLowerCase() === 'true') : false;

            if (authenticationToken) authenticationToken = decodeURI(authenticationToken);

            if (!tenantId && (!stateId || (!flowId && !flowVersionId))) {

                manywho.log.error('tenantId & stateId, or tenatntId & flowId & flowVersionId must be specified');
                return;

            }

            var storedConfig = localStorage.getItem('oauth-' + stateId);
            var config = (stateId) ? !manywho.utils.isNullOrWhitespace(storedConfig) && JSON.parse(storedConfig) : null;
            if (!config) {

                config = { tenantId: tenantId, flowId: flowId, flowVersionId: flowVersionId, container: container, options: options }

            }

            if (stateId && !isInitializing) {

                this.join(config.tenantId, config.flowId, config.flowVersionId, config.container, stateId, authenticationToken, config.options);

            }
            else {

                return initializeWithAuthorization.call(this,
                {
                    execute: initializeWithAuthorization.bind(this),
                    args: [config.tenantId, config.flowId, config.flowVersionId, config.container, config.options, authenticationToken || null],
                    name: 'initialize',
                    type: 'done'
                },
                config.tenantId,
                config.flowId,
                config.flowVersionId,
                config.container,
                config.options,
                authenticationToken);

            }

        },

        move: function(outcome, flowKey) {

            // Validate all of the components on the page here...
            // In the model.js, there are componentInputResponseRequests entries for each component
            // that needs to be validated. If a component does not validate correctly, it should
            // prevent the 'move' and also indicate in the UI which component has failed validation

            manywho.state.setComponentLoading(manywho.utils.extractElement(flowKey), { message: manywho.settings.global('localization.executing') }, flowKey);
            this.render(flowKey);

            var invokeRequest = manywho.json.generateInvokeRequest(
                manywho.state.getState(flowKey),
                'FORWARD',
                outcome.id,
                null,
                manywho.state.getPageComponentInputResponseRequests(flowKey),
                manywho.model.getDefaultNavigationId(flowKey),
                null,
                manywho.settings.flow('annotations', flowKey),
                manywho.state.getLocation(flowKey),
                manywho.settings.flow('mode', flowKey)
            );

            return moveWithAuthorization.call(this,
                {
                    execute: moveWithAuthorization,
                    context: this,
                    args: [invokeRequest, flowKey],
                    name: 'invoke',
                    type: 'done'
                },
                invokeRequest,
                flowKey);

        },

        flowOut: function(outcome, flowKey) {

            var tenantId = manywho.utils.extractTenantId(flowKey);
            var authenticationToken = manywho.state.getAuthenticationToken(flowKey);

            manywho.state.setComponentLoading(manywho.utils.extractElement(flowKey), null, flowKey);
            this.render(flowKey);

            return manywho.ajax.flowOut(manywho.utils.extractStateId(flowKey), tenantId, outcome.id, authenticationToken)
                    .then(function(response) {

                        var options = {
                            mode: manywho.settings.global('mode', flowKey, null),
                            reportingMode: manywho.settings.global('reportingMode', flowKey, null),
                            trackLocation: manywho.settings.global('trackLocation', flowKey, false),
                            replaceUrl: manywho.settings.global('replaceUrl', flowKey, true),
                            collaboration: {
                                isEnabled: manywho.settings.global('collaboration.isEnabled', flowKey, false)
                            },
                            autoFocusInput: manywho.settings.global('autoFocusInput', flowKey, true),
                            annotations: manywho.settings.global('annotations', flowKey, null),
                            navigation: {
                                isFixed: manywho.settings.global('navigation.isFixed', flowKey, false)
                            },
                            isFullWidth: manywho.settings.global('isFullWidth', flowKey, false)
                        };

                        manywho.model.deleteFlowModel(flowKey);
                        manywho.settings.remove(flowKey);
                        manywho.state.remove(flowKey);
                        manywho.social.remove(flowKey);
                        manywho.collaboration.remove(flowKey);
                        manywho.utils.removeFlowFromDOM(flowKey);

                        manywho.engine.join(tenantId, null, null, 'main', response.stateId, authenticationToken, options);

                    });

        },

        sync: function(flowKey) {

            // Validate all of the components on the page here...
            // In the model.js, there are componentInputResponseRequests entries for each component
            // that needs to be validated. If a component does not validate correctly, it should
            // prevent the 'move' and also indicate in the UI which component has failed validation

            var invokeRequest = manywho.json.generateInvokeRequest(
                manywho.state.getState(flowKey),
                'SYNC',
                null,
                null,
                manywho.state.getPageComponentInputResponseRequests(flowKey),
                null,
                manywho.settings.flow('annotations', flowKey),
                manywho.state.getLocation(flowKey),
                manywho.settings.flow('mode', flowKey)
            );
            var self = this;

            manywho.state.setComponentLoading(manywho.utils.extractElement(flowKey), { message: manywho.settings.global('localization.syncing') }, flowKey);
            this.render(flowKey);

            return manywho.ajax.invoke(invokeRequest, manywho.utils.extractTenantId(flowKey), manywho.state.getAuthenticationToken(flowKey))
                .then(function (response) {

                    if (manywho.utils.isEqual(response.invokeType, 'wait', true)) {

                        // The engine is currently busy (processing a parallel request on this state), try again
                        setTimeout(function () { self.sync(flowKey) }, 100);

                    }
                    else {

                        self.parseResponse(response, manywho.model.parseEngineSyncResponse, flowKey);
                        return processObjectDataRequests(manywho.model.getComponents(flowKey), flowKey);

                    }

                });

        },

        navigate: function(navigationId, navigationElementId, flowKey) {

            manywho.state.setComponentLoading('main', { message: manywho.settings.global('localization.navigating') }, flowKey);
            this.render(flowKey);

            var invokeRequest = manywho.json.generateNavigateRequest(
                manywho.state.getState(flowKey),
                navigationId,
                navigationElementId,
                manywho.state.getPageComponentInputResponseRequests(flowKey),
                manywho.settings.flow('annotations', flowKey),
                manywho.state.getLocation(flowKey)
            );

            moveWithAuthorization.call(this,
                {
                    execute: moveWithAuthorization,
                    context: this,
                    args: [invokeRequest, flowKey],
                    name: 'invoke',
                    type: 'done'
                },
                invokeRequest,
                flowKey);

        },

        join: function (tenantId, flowId, flowVersionId, container, stateId, authenticationToken, options) {

            var flowKey = manywho.utils.getFlowKey(tenantId, flowId, flowVersionId, stateId, container);

            if (options && options.authentication != null && options.authentication.sessionId != null) {

                manywho.state.setSessionData(options.authentication.sessionId, options.authentication.sessionUrl, flowKey);

            }

            if (options && options.callbacks != null && options.callbacks.length > 0) {

                options.callbacks.forEach(function (callback) {
                    manywho.callbacks.register(flowKey, callback);
                });

            }

            manywho.model.initializeModel(flowKey);
            manywho.settings.initializeFlow(options, flowKey);

            manywho.state.setAuthenticationToken(authenticationToken, flowKey);
            manywho.state.setState(stateId, null, null, flowKey);

            manywho.component.appendFlowContainer(flowKey);

            localStorage.setItem('oauth-' + stateId, JSON.stringify({
                tenantId: tenantId,
                flowId: flowId,
                flowVersionId: flowVersionId,
                container: container,
                options: options
            }));

            return joinWithAuthorization.call(this,
                {
                    execute: joinWithAuthorization.bind(this),
                    args: [flowKey],
                    name: 'invoke',
                    type: 'done'
                },
                flowKey);

        },

        returnToParent: function(flowKey, parentStateId) {

            var tenantId = manywho.utils.extractTenantId(flowKey);
            var authenticationToken = manywho.state.getAuthenticationToken(flowKey);

            var options = {
                mode: manywho.settings.global('mode', flowKey, null),
                reportingMode: manywho.settings.global('reportingMode', flowKey, null),
                trackLocation: manywho.settings.global('trackLocation', flowKey, false),
                replaceUrl: manywho.settings.global('replaceUrl', flowKey, true),
                collaboration: {
                    isEnabled: manywho.settings.global('collaboration.isEnabled', flowKey, false)
                },
                autoFocusInput: manywho.settings.global('autoFocusInput', flowKey, true),
                annotations: manywho.settings.global('annotations', flowKey, null),
                navigation: {
                    isFixed: manywho.settings.global('navigation.isFixed', flowKey, false)
                },
                isFullWidth: manywho.settings.global('isFullWidth', flowKey, false)
            };

            manywho.model.deleteFlowModel(flowKey);
            manywho.settings.remove(flowKey);
            manywho.state.remove(flowKey);
            manywho.social.remove(flowKey);
            manywho.collaboration.remove(flowKey);
            manywho.utils.removeFlowFromDOM(flowKey);

            manywho.engine.join(tenantId, null, null, 'main', parentStateId, authenticationToken, options);

        },

        objectDataRequest: function(id, request, flowKey, limit, search, orderBy, orderByDirection, page) {

            var self = this;

            manywho.state.setComponentLoading(id, { message: manywho.settings.global('localization.loading') }, flowKey);
            self.render(flowKey);

            return manywho.ajax.dispatchObjectDataRequest(request, manywho.utils.extractTenantId(flowKey), manywho.state.getAuthenticationToken(flowKey), limit, search, orderBy, orderByDirection, page)
                .then(function (response) {

                    var component = manywho.model.getComponent(id, flowKey);
                    component.objectData = response.objectData;
                    component.objectDataRequest.hasMoreResults = response.hasMoreResults;
                    manywho.state.setComponentError(id, null, flowKey);

                })
               .fail(function (xhr, status, error) {

                   manywho.state.setComponentError(id, error, flowKey);

               })
               .always(function () {

                   manywho.state.setComponentLoading(id, null, flowKey);
                   self.render(flowKey);

               });

        },

        fileDataRequest: function (id, request, flowKey, limit, search, orderBy, orderByDirection, page) {

            var self = this;

            manywho.state.setComponentLoading(id, { message: manywho.settings.global('localization.loading') }, flowKey);
            self.render(flowKey);

            return manywho.ajax.dispatchFileDataRequest(request, manywho.utils.extractTenantId(flowKey), manywho.state.getAuthenticationToken(flowKey), limit, search, orderBy, orderByDirection, page)
                .then(function (response) {

                    var component = manywho.model.getComponent(id, flowKey);
                    component.objectData = response.objectData;
                    component.fileDataRequest.hasMoreResults = response.hasMoreResults;

                })
               .fail(function (xhr, status, error) {

                   manywho.state.setComponentError(id, error, flowKey);

               })
               .always(function () {

                   manywho.state.setComponentLoading(id, null, flowKey);
                   self.render(flowKey);

               });

        },

        toggleDebug: function(flowKey) {

            manywho.settings.isDebugEnabled(flowKey, !manywho.settings.isDebugEnabled(flowKey));
            this.render(flowKey);

        },

        parseResponse: function(response, responseParser, flowKey) {

            responseParser.call(manywho.model, response, flowKey);

            manywho.state.setState(response.stateId, response.stateToken, response.currentMapElementId, flowKey);
            manywho.state.refreshComponents(manywho.model.getComponents(flowKey), flowKey);

            if (manywho.settings.flow('replaceUrl', flowKey)) {
                manywho.utils.replaceBrowserUrl(response);
            }

            if (manywho.utils.isEqual(response.invokeType, 'wait', true) ||
                manywho.utils.isEqual(response.invokeType, 'status', true)) {

                manywho.engine.ping(flowKey);
            }

        },

        ping: function (flowKey) {

            if (manywho.utils.isEqual(manywho.model.getInvokeType(flowKey), 'wait', true) ||
                manywho.utils.isEqual(manywho.model.getInvokeType(flowKey), 'status', true)) {

                var state = manywho.state.getState(flowKey);
                var self = this;

                manywho.ajax.ping(manywho.utils.extractTenantId(flowKey), state.id, state.token, manywho.state.getAuthenticationToken(flowKey))
                    .then(function (response) {

                        if (response)
                        {
                            var options = {
                                mode: manywho.settings.isDebugEnabled(flowKey) ? 'DEBUG' : ''
                            };

                            self.join(manywho.utils.extractTenantId(flowKey),
                                        manywho.utils.extractFlowId(flowKey),
                                        manywho.utils.extractFlowVersionId(flowKey),
                                        manywho.utils.extractElement(flowKey),
                                        state.id,
                                        manywho.state.getAuthenticationToken(flowKey),
                                        options);

                        }
                        else {

                            setTimeout(function () { self.ping(flowKey); }, 10000);

                        }

                    });

            }

        },

        render: function (flowKey) {

            var container = document.getElementById(flowKey);
            React.render(React.createElement(manywho.component.getByName(manywho.utils.extractElement(flowKey)), {flowKey: flowKey, container: container}), container);

        }
    }

})(manywho);
