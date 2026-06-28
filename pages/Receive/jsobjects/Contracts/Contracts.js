export default {
	stagedContracts: [],	// Holds contracts added in this batch
	filteredList: [],			// Hold our filter results for instant access
	contractMap: {}, 			// Hold the lookup map
	matchCount: 0,

	// --- 1. STATE VARIABLES ---
	filterTimer: null,     // Stores the timer ID
	isFiltering: false,    // The crash-prevention lock
	lastSearchText: null,  // Stores the last text typed *during* a cooldown
	searchIndex: [],

	buildSearchIndex: async () => {
		const rawData = get_pending_contracts.data;

		if (!rawData || !Array.isArray(rawData)) return;

		// --- PRE-SORT BY DATE (NEWEST FIRST) ---
		// We clone the array first ([...rawData]) to avoid mutating the original data source
		// checking for b.approval_date to prevent errors if dates are missing
		const sortedData = [...rawData].sort((a, b) => {
			return new Date(b.approval_date || 0) - new Date(a.approval_date || 0);
		});
		// ------------------------------------------------

		// Reset map
		this.contractMap = {}; // 2. Reset the map

		this.searchIndex = sortedData.map(c => {
			// POPULATE THE MAP (This is the optimization)
			// We map the ID directly to the object for instant access later
			if (c.loan_application_id) {
				this.contractMap[String(c.loan_application_id)] = c;
			}

			const nid = c.national_id ? String(c.national_id) : "";

			const phoneVariants = [];
			if (c.phone_number) {
				let cleanMobile = String(c.phone_number).trim();
				if (cleanMobile.startsWith('+')) cleanMobile = cleanMobile.substring(1);

				// Variant A: The clean number itself (e.g., "2010..." or "010...")
				// Variant B: If DB has "2010...", we want to support searching "010..."
				phoneVariants.push(cleanMobile);
				if (cleanMobile.startsWith('2')) phoneVariants.push(cleanMobile.substring(1));
			}

			return {
				originalData: c,
				nid: nid,
				phoneVariants: phoneVariants
			};
		});
	},

	throttleFilter: (searchText) => {
		if (this.isFiltering) return; // If main filter is already running, stop
		this.lastSearchText = searchText;	// Always save latest text
		if (this.filterTimer) return; // Is a timer running? (i.e., are we in the 250ms cooldown?)

		// --- No cooldown is active ---

		// 1. Run the filter IMMEDIATELY
		this.updateFilter(searchText); 

		// 2. Start the 250ms "cooldown" timer
		this.filterTimer = setTimeout(() => {
			// --- 250ms Cooldown Over ---

			// Check if the text we just filtered (searchText)
			// is *different* from the *last* text the user typed (this.lastSearchText).
			if (this.lastSearchText !== searchText) {
				// Yes. The user typed during the cooldown.
				// Run the filter AGAIN with the latest text. (Your 2nd requirement)
				this.updateFilter(this.lastSearchText);
			}

			// 3. Cooldown is over, clear the timer.
			this.filterTimer = null;

		}, 250); // 250ms cooldown
	},


	// 3. UPDATED: The Fast Filter
	updateFilter: async (searchText) => { 
		if (this.isFiltering) return; 
		this.isFiltering = true; 

		try {
			// Guard: Check if index exists
			if (!this.searchIndex || this.searchIndex.length === 0) {
				this.isFiltering = false; return;
			}

			// --- 2. CHECK FOR INVALID INPUT (NULL, TOO SHORT) ---
			let minLength = 5;
			let isInvalid = false;

			if (searchText === null || searchText === undefined) {
				isInvalid = true;
			} else {
				if (searchText.startsWith('0')) minLength = 6;
				else if (searchText.startsWith('20')) minLength = 7;
				if (searchText.length < minLength) isInvalid = true;
			}

			if (isInvalid) {
				await text_help.setText("");
				this.filteredList = [];
				this.matchCount = 0;
				this.isFiltering = false; 
				return; 
			}

			// --- THE NEW FAST LOOP ---
			// No string conversion. No trimming. Just string comparison.
			const matches = [];
			const limit = 5;

			for (const item of this.searchIndex) {
				// Check NID
				if (item.nid.startsWith(searchText)) {
					matches.push(item.originalData);
				} 
				// Check Phone (loop through pre-calculated variants)
				else {
					for (const variant of item.phoneVariants) {
						if (variant.startsWith(searchText)) {
							matches.push(item.originalData);
							break; // Found a match, stop checking variants
						}
					}
				}

				// Optimization: Stop searching once we have enough matches
				// to fill the UI + 1 (to trigger the "Too many matches" logic)
				if (matches.length >= limit) {
					break; 
				}
			}

			const tempList = matches;

			// ... (Keep your existing Match Count / Helper Text logic) ...
			this.matchCount = (matches.length >= limit) ? 99 : matches.length; // Hack to trigger > 3 logic

			// SET FILTER & HELPER TEXT
			if (this.matchCount > 4) {
				await text_help.setText("Multiple matches found. Keep typing."); await text_help.setTextColor('blue');
				this.filteredList = [];
			} else if (this.matchCount > 0) {
				await text_help.setText("");
				this.filteredList = tempList;
			} else {
				await text_help.setText("No matches found!"); await text_help.setTextColor('red');
				this.filteredList = [];
			}

		} catch (error) {
			console.error("Filter crash:", error);
		} finally {
			this.isFiltering = false;
		}
	},

	/* Clears the filteredList on success or warning. */
	addContractByPk: (pk, contractType, initialComment, scannedDocs) => {
		const contract = this.contractMap[String(pk)];

		if (!contract) {
			showAlert('Error: Invalid Barcode or Loan ID.', 'error');
			return;
		}

		const alreadyStaged = this.stagedContracts.some(staged => staged.loan_application_id === contract.loan_application_id);
		if (alreadyStaged) {
			showAlert('Warning: Contract already scanned in this shipment.', 'warning');
			input_search.setValue('');
			text_help.setText('');
			this.filteredList = []; // <-- CLEAR LIST
			return;
		}

		// Create a new object with the contract data + our new fields
		const newStagedItem = {
			...contract,
			comment: initialComment || null,              // Barcode first-scan sets the "missing half" flag; legacy adds stay null
			contract_type: contractType || 'HANDWRITTEN', // PREFILLED for barcoded contracts, HANDWRITTEN for legacy
			scannedDocs: scannedDocs || null,             // { C, P } page-presence tracker for barcoded contracts; null for legacy
			addedTime: moment().toISOString()
		};

		this.stagedContracts.push(newStagedItem);
		showAlert(`Added: ${contract.customer_name}`, 'success');
		this.persistBackup();
		input_search.setValue('');
		text_help.setText('');
		this.filteredList = [];
	},

	removeContract: (pk) => {
		// Re-create the array, excluding the contract with the matching pk
		this.stagedContracts = this.stagedContracts.filter(c => c.loan_application_id !== pk);
		this.persistBackup();

		showAlert('Contract removed from shipment.', 'info');
	},

	processInput: () => {
		const raw = input_search.text;

		// --- BARCODE PATH: prefilled contracts carry a "C-"/"P-" prefix (C = Contract page, P = PN page) ---
		const barcode = raw ? raw.match(/^([CcPp])-0*(\d+)$/) : null;
		if (barcode) {
			this.handleBarcode(barcode[1].toUpperCase(), barcode[2]); // docType ('C'|'P'), loan id with leading zeros stripped
			resetWidget("input_search", true);
			return;
		}

		// --- LEGACY PATH: handwritten contracts entered by loan ID / NID / mobile ---
		const matches = this.filteredList;

		if (matches.length === 1) {
			// Case A: Single partial match. Add it.
			this.addContractByPk(matches[0].loan_application_id, 'HANDWRITTEN');
			resetWidget("input_search", true);
		} else if (matches.length > 1) {
			// Case B: Multiple partial matches. Warn.
			showAlert("Multiple matches found. Please select from the list.", "info");
		} else { // matches.length === 0
			// Case C: No partial matches found.
			// Assume it's a raw loan ID and try to add it.
			this.addContractByPk(raw, 'HANDWRITTEN');
			resetWidget("input_search", true);
		}
	},

	/* Barcode scan of a prefilled contract. Each contract is two pages (C = Contract, P = PN)
	   tracked separately in scannedDocs so a re-scan of the SAME page is rejected and only the
	   genuine complementary page completes the pair and clears the flag. */
	handleBarcode: (docType, pk) => {
		const existing = this.stagedContracts.find(c => String(c.loan_application_id) === String(pk));

		if (existing) {
			if (!existing.scannedDocs) {
				// Added some other way (e.g. legacy search) — not a barcode pair we track.
				showAlert('Warning: Contract already in this shipment.', 'warning');
			} else if (existing.scannedDocs[docType]) {
				// Same physical page scanned twice — do NOT treat as a complete pair.
				const page = (docType === 'C') ? 'Contract' : 'PN';
				const missing = (docType === 'C') ? 'PN' : 'Contract';
				showAlert(`Warning: ${page} page already scanned — ${missing} page still needed.`, 'warning');
			} else {
				// Genuine complementary page → pair is now complete.
				existing.scannedDocs[docType] = true;
				existing.comment = this.deriveComment(existing.scannedDocs);
				this.persistBackup();
				showAlert(`Pair complete: ${existing.customer_name}`, 'success');
			}
			text_help.setText('');
			this.filteredList = [];
			return;
		}

		// First page of a new pair → add the contract with the appropriate "missing half" flag.
		const scannedDocs = { C: docType === 'C', P: docType === 'P' };
		this.addContractByPk(pk, 'PREFILLED', this.deriveComment(scannedDocs), scannedDocs);
	},

	// Derives the staged comment from which pages have been scanned. Both present → no flag.
	deriveComment: (scannedDocs) => {
		if (scannedDocs.C && scannedDocs.P) return null;
		return scannedDocs.C ? 'Contract w/o PN' : 'PN w/o Contract';
	},

	updateComment: (pk, comment) => {
		if (comment === 'DIVIDER') return;

		// Find the item in the staged list
		const item = this.stagedContracts.find(contract => contract.loan_application_id === pk);
		if (item) {
			// Update its comment value
			item.comment = (comment==='DELETE') ? null : comment;
		}
	},

	// Save current stage to local storage
	persistBackup: () => {
		storeValue('backup_staged', this.stagedContracts);
	},
}