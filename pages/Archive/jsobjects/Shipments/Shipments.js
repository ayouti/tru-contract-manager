export default {

	getShipmentDetails : async () => {
		table_shipmentDetails.setVisibility(false);
		text_ShipmentStatus.setVisibility(false);
		await get_shipment_details.run({
			shipmentNumber: table_shipments.selectedRow.shipment_number,
			drawerNumber: table_shipments.selectedRow.drawer_number
		});

		if (get_shipment_details.responseMeta.isExecutionSuccess) {
			if (get_shipment_details.data?.length > 0) {
				table_shipmentDetails.setData(get_shipment_details.data);
				table_shipmentDetails.setVisibility(true);
				text_ShipmentStatus.setVisibility(true);
			} else {
				get_shipments.run();
			}
		}
	},

	reloadShipment : async () => {
		await get_shipment_details.run({
			shipmentNumber: table_shipments.selectedRow.shipment_number,
			drawerNumber: table_shipments.selectedRow.drawer_number
		});

		if (get_shipment_details.responseMeta.isExecutionSuccess) {
			table_shipmentDetails.setData(get_shipment_details.data);
		}
	},

	archiveShipment : async () => {
		// Client-side validation
		const contracts = get_shipment_details.data || [];
		const hasInvalidContracts = contracts.some(row => 
																							 !row.pn_revision_id || 
																							 row.pn_revision_id === "" || 
																							 !row.second_review_date
																							);

		if (hasInvalidContracts) {
			showAlert("Cannot archive: Shipment contains unreviewed contracts or missing PN Revision IDs", "error");
			return;
		}

		showAlert("Removing shipment from drawer... Please wait.", "info");

		// Call API
		await archive_shipment.run({
			shipmentNumber: table_shipments.selectedRow.shipment_number,
			drawerNumber: table_shipments.selectedRow.drawer_number
		});

		await get_shipments.run();

		showAlert("Shipment successfully removed from drawer.", "success");
	}
}