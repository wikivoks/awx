function AddCredentialsController (models, $state, $scope, strings, componentsStrings) {
    const vm = this || {};

    const { me, credential, credentialType, organization } = models;

    vm.mode = 'add';
    vm.strings = strings;
    vm.panelTitle = strings.get('add.PANEL_TITLE');

    vm.tab = {
        details: { _active: true },
        permissions: { _disabled: true }
    };

    vm.form = credential.createFormSchema('post', {
        omit: ['user', 'team', 'inputs']
    });

    vm.form.disabled = !credential.isCreatable();

    vm.form.organization._resource = 'organization';
    vm.form.organization._route = 'credentials.add.organization';
    vm.form.organization._model = organization;
    vm.form.organization._placeholder = strings.get('inputs.ORGANIZATION_PLACEHOLDER');

    vm.form.credential_type._resource = 'credential_type';
    vm.form.credential_type._route = 'credentials.add.credentialType';
    vm.form.credential_type._model = credentialType;
    vm.form.credential_type._placeholder = strings.get('inputs.CREDENTIAL_TYPE_PLACEHOLDER');

    const gceFileInputSchema = {
        id: 'gce_service_account_key',
        type: 'file',
        label: strings.get('inputs.GCE_FILE_INPUT_LABEL'),
        help_text: strings.get('inputs.GCE_FILE_INPUT_HELP_TEXT'),
    };

    let gceFileInputPreEditValues;

    vm.form.inputs = {
        _get: () => {
            credentialType.mergeInputProperties();

            const fields = credentialType.get('inputs.fields');

            if (credentialType.get('name') === 'Google Compute Engine') {
                fields.splice(2, 0, gceFileInputSchema);
                $scope.$watch(`vm.form.${gceFileInputSchema.id}._value`, vm.gceOnFileInputChanged);
            }

            return fields;
        },
        _source: vm.form.credential_type,
        _reference: 'vm.form.inputs',
        _key: 'inputs'
    };

    vm.form.save = data => {
        data.user = me.get('id');

        if (_.get(data.inputs, gceFileInputSchema.id)) {
            delete data.inputs[gceFileInputSchema.id];
        }

        return credential.request('post', { data });
    };

    vm.form.onSaveSuccess = res => {
        $state.go('credentials.edit', { credential_id: res.data.id }, { reload: true });
    };

    vm.gceOnFileInputChanged = (value, oldValue) => {
        if (value === oldValue) return;

        const gceFileIsLoaded = !!value;
        const gceFileInputState = vm.form[gceFileInputSchema.id];
        const { obj, error } = vm.gceParseFileInput(value);

        gceFileInputState._isValid = !error;
        gceFileInputState._message = error ? componentsStrings.get('message.INVALID_INPUT') : '';

        vm.form.project._disabled = gceFileIsLoaded;
        vm.form.username._disabled = gceFileIsLoaded;
        vm.form.ssh_key_data._disabled = gceFileIsLoaded;
        vm.form.ssh_key_data._displayHint = !vm.form.ssh_key_data._disabled;

        if (gceFileIsLoaded) {
            gceFileInputPreEditValues = Object.assign({}, {
                project: vm.form.project._value,
                ssh_key_data: vm.form.ssh_key_data._value,
                username: vm.form.username._value
            });
            vm.form.project._value = _.get(obj, 'project_id', '');
            vm.form.ssh_key_data._value = _.get(obj, 'private_key', '');
            vm.form.username._value = _.get(obj, 'client_email', '');
        } else {
            vm.form.project._value = gceFileInputPreEditValues.project;
            vm.form.ssh_key_data._value = gceFileInputPreEditValues.ssh_key_data;
            vm.form.username._value = gceFileInputPreEditValues.username;
        }
    };

    vm.gceParseFileInput = value => {
        let obj;
        let error;

        try {
            obj = angular.fromJson(value);
        } catch (err) {
            error = err;
        }

        return { obj, error };
    };
}

AddCredentialsController.$inject = [
    'resolvedModels',
    '$state',
    '$scope',
    'CredentialsStrings',
    'ComponentsStrings'
];

export default AddCredentialsController;
