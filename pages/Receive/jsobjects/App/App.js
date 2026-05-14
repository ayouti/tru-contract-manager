export default {
	init: async () => {
		// Check for Flash Message
		if (appsmith.store.flash_submit_success) {
			// Show alert then destroy flag
			showAlert('Shipment submitted successfully!', 'success');
			await removeValue('flash_submit_success');
		}

		await get_pending_contracts.run();
		await Contracts.buildSearchIndex();
	},

	// UPDATED: Now clears Contracts.filteredList as well
	reset: () => {
		Shipments.details = {};
		Contracts.stagedContracts = [];
		Contracts.filteredList = [];
		storeValue('backup_staged', []);	// CLEAR BACKUP on reset/finalize

		input_search.setValue('');

		container_shipmentNew.setVisibility(true);

		resetWidget('modal_newShipment', true);
		resetWidget('input_drawerNumber', true);
	}
}