// js/itemManager.js
import { state } from './state.js';
import { dom } from './dom.js';

function save() {
    localStorage.setItem('floorPlanItems', JSON.stringify(state.items));
}

export function load() {
    state.items = JSON.parse(localStorage.getItem('floorPlanItems')) || [];
}

export function remove(index) {
    state.items.splice(index, 1);
    save();
    render();
}

export function render() {
    dom.itemList.innerHTML = '';
    if (state.items.length === 0) {
        dom.emptyMessage.classList.remove('hidden');
        dom.exportBtn.disabled = true;
    } else {
        dom.emptyMessage.classList.add('hidden');
        dom.exportBtn.disabled = false;
        state.items.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'bg-slate-100 p-4 rounded-lg flex justify-between items-center';
            
            const info = document.createElement('div');
            info.innerHTML = `<p class="font-medium text-slate-800">${item.product}</p><p class="text-sm text-slate-500">${item.location}</p>`;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'text-red-500 hover:text-red-700 font-semibold text-xl';
            removeBtn.innerHTML = '&times;';
            removeBtn.addEventListener('click', () => remove(index));
            
            el.appendChild(info);
            el.appendChild(removeBtn);
            dom.itemList.appendChild(el);
        });
    }
}

export function add() {
    const product = dom.productNameInput.value.trim();
    const location = dom.tileLocationSelect.value; 

    if (product && location) {
        state.items.push({ product, location });
        save();
        render();
        dom.productNameInput.value = '';
        dom.tileLocationSelect.selectedIndex = 0;
        dom.productNameInput.focus();
    } else {
        dom.addItemBtn.textContent = 'Please fill out both fields!';
        dom.addItemBtn.classList.add('bg-red-500');
        setTimeout(() => {
            dom.addItemBtn.textContent = 'Add Item';
            dom.addItemBtn.classList.remove('bg-red-500');
        }, 1500);
    }
}

export function exportToCSV() {
    const header = ['Product Name', 'Tile Location'];
    const csv = state.items.map(item => `"${item.product}","${item.location}"`);
    const csvContent = "data:text/csv;charset=utf-8," + header.join(',') + '\n' + csv.join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'floor_plan_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
