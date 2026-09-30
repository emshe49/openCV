const fileInput = document.querySelector("#image-input");
const dropZone = document.querySelector("#drop-zone");
const preview = document.querySelector("#upload-preview");
const fileTitle = document.querySelector("#file-title");
const fileDetail = document.querySelector("#file-detail");
const colorInput = document.querySelector('input[name="color"]');
const colorValue = document.querySelector("#color-value");
const thicknessInput = document.querySelector('input[name="thickness"]');
const thicknessValue = document.querySelector("#thickness-value");
const sizeInput = document.querySelector('input[name="size"]');
const sizeValue = document.querySelector("#size-value");
const shapeInputs = document.querySelectorAll('input[name="shape"]');
const fillRow = document.querySelector("#fill-row");

function showSelectedFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    preview.src = URL.createObjectURL(file);
    fileTitle.textContent = file.name;
    fileDetail.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB · Click to replace`;
    dropZone.classList.add("has-file");
}

fileInput?.addEventListener("change", () => showSelectedFile(fileInput.files[0]));

["dragenter", "dragover"].forEach((eventName) => {
    dropZone?.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.add("dragging");
    });
});

["dragleave", "drop"].forEach((eventName) => {
    dropZone?.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.remove("dragging");
    });
});

dropZone?.addEventListener("drop", (event) => {
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    showSelectedFile(file);
});

colorInput?.addEventListener("input", () => { colorValue.textContent = colorInput.value; });
thicknessInput?.addEventListener("input", () => { thicknessValue.textContent = `${thicknessInput.value} px`; });
sizeInput?.addEventListener("input", () => { sizeValue.textContent = `${sizeInput.value}%`; });

function updateFillAvailability() {
    const selected = document.querySelector('input[name="shape"]:checked')?.value;
    fillRow?.classList.toggle("disabled", selected === "line");
}

shapeInputs.forEach((input) => input.addEventListener("change", updateFillAvailability));
updateFillAvailability();
