export default {

	getShipmentDetails : async () => {
		table_shipmentDetails.setVisibility(false);
		text_ShipmentStatus.setVisibility(false);
		await get_shipment_details.run({
			shipmentNumber: table_shipments.selectedRow.shipment_number,
			drawerNumber: table_shipments.selectedRow.drawer_number
		});

		if (get_shipment_details.responseMeta.isExecutionSuccess) {
			table_shipmentDetails.setData(get_shipment_details.data);
			table_shipmentDetails.setVisibility(true);
			text_ShipmentStatus.setVisibility(true);
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
		showAlert("Removing shipment from drawer... Please wait.", "info");

		// 2. Call API
		await archive_shipment.run({
			shipmentNumber: table_shipments.selectedRow.shipment_number,
			drawerNumber: table_shipments.selectedRow.drawer_number // Added this line
		});

		await get_shipments.run();

		showAlert("Shipment successfully removed from drawer.", "success");
	}
}