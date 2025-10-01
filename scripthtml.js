// script.js

const UPLOAD_URL = 'http://localhost:3000/upload-pdf'; 
const LIST_URL = 'http://localhost:3000/arquivos';
const statusDiv = document.getElementById('status-mensagem');

// Executa ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(event) {
            event.preventDefault(); 
            enviarPDF();
        });
    }
    
    // Carrega a lista de arquivos ao iniciar
    carregarArquivos();
});

// Carrega a lista de arquivos do backend
async function carregarArquivos() {
    const listaDiv = document.getElementById('lista-arquivos');
    listaDiv.innerHTML = "Carregando arquivos...";

    try {
        const response = await fetch(LIST_URL);
        const arquivos = await response.json(); // Lista de objetos {id, nome_original, data_upload}

        renderizarArquivos(arquivos);

    } catch (error) {
        listaDiv.innerHTML = "Falha ao carregar a lista de arquivos. Verifique a conexão com o servidor.";
        console.error("Erro ao carregar lista:", error);
    }
}

// Renderiza a lista na página
function renderizarArquivos(arquivos) {
    const listaDiv = document.getElementById('lista-arquivos');
    
    if (arquivos.length === 0) {
        listaDiv.innerHTML = "<p>Nenhum arquivo PDF enviado ainda.</p>";
        return;
    }

    const listaHTML = arquivos.map(file => {
        // Formata a data para melhor visualização
        const dataFormatada = new Date(file.data_upload).toLocaleDateString('pt-BR', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        });
        const downloadUrl = `http://localhost:3000/download/${file.id}`;
        
        return `
            <p>
                <strong>[ID ${file.id}] ${file.nome_original}</strong> 
                (Enviado em: ${dataFormatada}) 
                <a href="${downloadUrl}" target="_blank">[Baixar]</a>
            </p>
        `;
    }).join('');

    listaDiv.innerHTML = listaHTML;
}

// Lógica de envio
async function enviarPDF() {
    const fileInput = document.getElementById('pdfFile');
    
    if (fileInput.files.length === 0) {
        statusDiv.textContent = 'Por favor, selecione um arquivo PDF.';
        return;
    }
    
    // restante da lógica de envio e formData
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('pdfFile', file); 

    statusDiv.style.backgroundColor = '#fffacd'; 
    statusDiv.textContent = `Enviando arquivo: ${file.name}...`;


    try {
        const response = await fetch(UPLOAD_URL, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (response.ok) {
            statusDiv.style.backgroundColor = '#d4edda'; 
            statusDiv.innerHTML = `
                Sucesso! Arquivo salvo e registrado.
            `;
            document.getElementById('uploadForm').reset(); 
            
            // Recarrega a lista para mostrar o arquivo recém-enviado
            carregarArquivos(); 

        } else {
            statusDiv.style.backgroundColor = '#f8d7da'; 
            statusDiv.textContent = `Erro no envio (Status: ${response.status}): ${data.mensagem || response.statusText}`;
        }

    } catch (error) {
        statusDiv.style.backgroundColor = '#fff3cd'; 
        statusDiv.textContent = `Erro de Conexão: Não foi possível conectar ao servidor. Verifique se o Node.js está ativo.`;
        console.error('Erro de envio:', error);
    }
}