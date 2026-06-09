export default {
	// Holds the shipment number and drawer
	details: {}, 

	// Saves shipment details from the modal and preps the UI.
	startShipment: () => {
		// 1. Store details
		this.details = {
			shipmentNumber: input_shipmentNumber.text,
			startTime: moment().toISOString()
		};

		// 2. Update UI
		container_shipmentNew.setVisibility(false);
		container_stats.setVisibility(false);

		// 3. Close modal and focus input
		input_search.setValue('');
		closeModal(modal_newShipment.name);

		// 3. Check for backup
		const backup = appsmith.store.backup_staged;
		if (backup && Array.isArray(backup) && backup.length > 0) {
			// Restore the data
			Contracts.stagedContracts = backup;
			showAlert(`Restored ${backup.length} contract(s) from previous session.`, 'info');
		}
	},

	submitShipment: async () => {

		try {

			// 1. Create the array of rows formatted STRICTLY for PostgreSQL
			const rowsArray = Contracts.stagedContracts.map(contract => {
				return {
					loan_application_id: contract.loan_application_id,
					approval_date: contract.approval_date ? moment(contract.approval_date).tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss") : null,
					agent_id: contract.agent_code,
					agent_name: contract.agent_name,
					branch: contract.activation_merchant_branch,
					customer_name: contract.customer_name,
					customer_phone: contract.phone_number,
					customer_national_id: contract.national_id,
					approval_limit: contract.application_limit,
					received_by: appsmith.user.email,
					shipment_received_date: moment(this.details.startTime).tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss"),
					contract_received_date: moment(contract.addedTime).tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss"),
					shipment_finish_date: moment().tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss"),

					shipment_number: this.details.shipmentNumber,
					drawer_number: input_drawerNumber.text,
					comment: contract.comment
				};
			});

			// 2. Call the new Postgres query and pass the rows
			await finalize_shipment.run({ rows: JSON.stringify(rowsArray) });

			// Set the flash flag, reset (for the backup), then refresh the page
			await storeValue('flash_submit_success', true);
			await App.reset(); // Reset the app to its initial state
			navigateTo(appsmith.URL.fullPath, {}, 'SAME_WINDOW');

		} catch (error) {
			showAlert('Error: One or more contracts failed to update!', 'error');

			//console.error("DB Insert Error:", error); 
			//const errorMessage = error.message ? error.message : JSON.stringify(error);
			//showAlert(`Error: ${errorMessage}`, 'error'); 
		}
	}

	/*
	submitShipment_old: async () => {
		try {
			// 1. Create the array of rows for the KPIs Google Sheet
			const rowsKPIsArray = Contracts.stagedContracts.map(contract => {
				return {
					"Receiver": appsmith.user.email,
					"Loan Application ID": contract.loan_application_id,
					"Shipment Number": this.details.shipmentNumber,
					"Shipment Start Date": moment(this.details.startTime).tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss.SSS"),
					"Contract Received Date": moment(contract.addedTime).tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss.SSS"),
					"Shipment Finish Date": moment().tz("Africa/Cairo").format("YYYY-MM-DD HH:mm:ss.SSS"),
				};
			});
			// 2. Call the new GSheet query and pass the rows
			await save_kpis.run({ rows: rowsKPIsArray });

			// Set the flash flag, reset (for the backup), then refresh the page
			await storeValue('flash_submit_success', true);
			await App.reset(); // Reset the app to its initial state
			navigateTo(appsmith.URL.fullPath, {}, 'SAME_WINDOW');

		} catch (error) {
			showAlert('Error: One or more contracts failed to update!', 'error');
		}
	} */
}