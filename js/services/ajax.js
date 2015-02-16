manywho.ajax = (function (manywho) {

    function onError(xhr, status, error) {

        log.error(error);

    }

    return {

        login: function (loginUrl, username, password, sessionId, sessionUrl, stateId) {

            log.info('Logging into Flow State: \n    Id: ' + stateId);

            var authenticationCredentials = {
                username: null,
                password: null,
                token: null,
                sessionToken: sessionId,
                sessionUrl: sessionUrl,
                loginUrl: loginUrl
            };

            return $.ajax({
                url: 'https://flow.manywho.com/api/run/1/authentication/' + stateId,
                type: 'POST',
                dataType: 'json',
                contentType: 'application/json',
                processData: true,
                data: JSON.stringify(authenticationCredentials),
                beforeSend: function (xhr) {

                    xhr.setRequestHeader('ManyWhoTenant', manywho.model.getTenantId());

                    if (manywho.settings.get('authentication.token')) {
                        xhr.setRequestHeader('Authorization', manywho.settings.get('authentication.token'));
                    }

                    if (manywho.settings.get('events.login.beforeSend')) {
                        manywho.settings.get('events.login.beforeSend').call(this, xhr);
                    }

                }
            })
            .done(manywho.settings.get('events.login.done'))
            .fail(onError)
            .fail(manywho.settings.get('events.login.fail'));

        },

        initialize: function (engineInitializationRequest) {

            log.info('Initializing Flow: \n    Id: ' + engineInitializationRequest.flowId.id + '\n    Version Id: ' + engineInitializationRequest.flowId.versionId);

            return $.ajax({
                url: 'https://flow.manywho.com/api/run/1',
                type: 'POST',
                dataType: 'json',
                contentType: 'application/json',
                processData: true,
                data: JSON.stringify(engineInitializationRequest),
                beforeSend: function (xhr) {

                    xhr.setRequestHeader('ManyWhoTenant', manywho.model.getTenantId());

                    if (manywho.settings.get('authentication.token')) {
                        xhr.setRequestHeader('Authorization', manywho.settings.get('authentication.token'));
                    }

                    if (manywho.settings.get('events.initialization.beforeSend')) {
                        manywho.settings.get('events.initialization.beforeSend').call(this, xhr);
                    }

                }
            })
            .done(manywho.settings.get('events.initialization.done'))
            .fail(onError)
            .fail(manywho.settings.get('events.initialization.fail'));

        },

        join: function(stateId) {

            log.info('Joining State: ' + stateId);

            return $.ajax({
                url: 'https://flow.manywho.com/api/run/1/state/' + stateId,
                type: 'GET',
                contentType: 'application/json',
                processData: true,
                beforeSend: function (xhr) {

                    xhr.setRequestHeader('ManyWhoTenant', manywho.model.getTenantId());

                    if (manywho.settings.get('authentication.token')) {
                        xhr.setRequestHeader('Authorization', manywho.settings.get('authentication.token'));
                    }

                    if (manywho.settings.get('events.join.beforeSend')) {
                        manywho.settings.get('events.join.beforeSend').call(this, xhr);
                    }

                }
            })
            .done(manywho.settings.get('events.join.done'))
            .fail(onError)
            .fail(manywho.settings.get('events.join.fail'));

        },
        
        invoke: function (engineInvokeRequest) {

            return $.ajax({
                url: 'https://flow.manywho.com/api/run/1/state/' + engineInvokeRequest.stateId,
                type: 'POST',
                dataType: 'json',
                contentType: 'application/json',
                processData: true,
                data: JSON.stringify(engineInvokeRequest),
                beforeSend: function (xhr) {

                    xhr.setRequestHeader('ManyWhoTenant', manywho.model.getTenantId());

                    if (manywho.settings.get('authentication.token')) {
                        xhr.setRequestHeader('Authorization', manywho.settings.get('authentication.token'));
                    }

                    if (manywho.settings.get('events.invoke.beforeSend')) {
                        manywho.settings.get('events.invoke.beforeSend').call(this, xhr);
                    }

                }
            })
            .done(manywho.settings.get('events.invoke.done'))
            .fail(onError)
            .fail(manywho.settings.get('events.invoke.fail'));

        },

        getNavigation: function (stateId, stateToken, navigationElementId) {
            
            return $.ajax({
                url: 'https://flow.manywho.com/api/run/1/navigation/' + stateId,
                type: 'POST',
                dataType: 'json',
                contentType: 'application/json',
                processData: true,
                data: JSON.stringify({ 'stateId': stateId, 'stateToken': stateToken, 'navigationElementId': navigationElementId }),
                beforeSend: function (xhr) {

                    xhr.setRequestHeader('ManyWhoTenant', manywho.model.getTenantId());

                    if (manywho.settings.get('authentication.token')) {
                        xhr.setRequestHeader('Authorization', manywho.settings.get('authentication.token'));
                    }

                    if (manywho.settings.get('events.navigation.beforeSend')) {
                        manywho.settings.get('events.navigation.beforeSend').call(this, xhr);
                    }

                }
            })
            .done(manywho.settings.get('events.navigation.done'))
            .fail(onError)
            .fail(manywho.settings.get('events.navigation.fail'));

        },
        
        dispatchObjectDataRequest: function (request, limit, search, orderBy, orderByDirection, page) {

            request.listFilter = request.listFilter || {};           
            request.listFilter.limit = limit;
            request.listFilter.search = search || null;
            
            if (orderBy) {
                request.listFilter.orderBy = orderBy;
                request.listFilter.orderByDirection = orderByDirection;
            }

            if (page > 0) {
                request.listFilter.offset = page * request.listFilter.limit;
            }

            log.info('Dispatching object data request');

            return $.ajax({
                url: 'https://flow.manywho.com/api/service/1/data',
                type: 'POST',
                dataType: 'json',
                contentType: 'application/json',
                processData: true,
                data: JSON.stringify(request),
                beforeSend: function (xhr) {

                    xhr.setRequestHeader('ManyWhoTenant', manywho.model.getTenantId());

                    if (manywho.settings.get('authentication.token')) {
                        xhr.setRequestHeader('Authorization', manywho.settings.get('authentication.token'));
                    }

                    if (manywho.settings.get('events.objectData.beforeSend')) {
                        manywho.settings.get('events.objectData.beforeSend').call(this, xhr);
                    }

                }
            })
            .done(manywho.settings.get('events.objectData.done'))
            .fail(onError)
            .fail(manywho.settings.get('events.objectData.fail'));

        },

        ping: function (stateId, stateToken) {

            log.info('Pinging for changes');

            return $.ajax({
                url: 'https://flow.manywho.com/api/run/1/state/' + stateId + '/ping/' + stateToken,
                type: 'GET',
                beforeSend: function (xhr) {

                    xhr.setRequestHeader('ManyWhoTenant', manywho.model.getTenantId());

                    if (manywho.settings.get('authentication.token')) {
                        xhr.setRequestHeader('Authorization', manywho.settings.get('authentication.token'));
                    }

                }
            })
            .fail(onError);

        }

    }

})(manywho);