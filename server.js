// server.js

const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors'); 
const fs = require('fs');
const db = require('./db');     

const app = express();
const port = 3000;

app.use(cors()); 

// --- Configuração de Upload (Multer) ---
const uploadDir = path.join(__dirname, 'uploads/pdfs/');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Diretório de upload criado: ${uploadDir}`);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); 
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } 
}).single('pdfFile'); 


//  Upload (POST)
app.post('/upload-pdf', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
        return res.status(500).json({ mensagem: "Falha ao enviar o arquivo: " + err.message });
    }
    if (!req.file) {
        return res.status(400).json({ mensagem: "Nenhum arquivo PDF foi enviado ou o arquivo não é válido." });
    }

    const fileData = req.file;
    const sqlQuery = `
        INSERT INTO arquivos_pdf 
        (nome_original, nome_salvo, caminho_servidor, tamanho_bytes)
        VALUES ($1, $2, $3, $4) 
        RETURNING id;
    `;
    const values = [fileData.originalname, fileData.filename, fileData.path, fileData.size];

    try {
        const result = await db.query(sqlQuery, values);
        const novoId = result.rows[0].id; 
        
        res.status(200).json({ 
            mensagem: `Arquivo salvo e registrado com ID: ${novoId}`,
            id_registro: novoId // Retorna o ID
        });

    } catch (dbError) {
        console.error('Erro ao salvar no banco:', dbError);
        fs.unlink(fileData.path, (unlinkErr) => {
            if (unlinkErr) console.error("Falha ao deletar arquivo órfão:", unlinkErr);
        });

        return res.status(500).json({ 
            mensagem: "Erro ao registrar o arquivo no banco de dados. O arquivo foi removido do servidor." 
        });
    }
  });
});

// Download (GET)
app.get('/download/:id', async (req, res) => {
    const fileId = req.params.id;

    if (!fileId) {
        return res.status(400).json({ mensagem: "ID do arquivo não fornecido." });
    }

    try {
        const query = `
            SELECT nome_original, caminho_servidor 
            FROM arquivos_pdf 
            WHERE id = $1;
        `;
        const result = await db.query(query, [fileId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ mensagem: "Arquivo não encontrado no banco de dados." });
        }

        const fileInfo = result.rows[0];
        const filePath = fileInfo.caminho_servidor;
        const originalName = fileInfo.nome_original;

        if (fs.existsSync(filePath)) {
            res.download(filePath, originalName, (err) => {
                if (err) {
                    console.error("Erro ao enviar o arquivo:", err);
                    res.status(500).json({ mensagem: "Falha ao processar o download do arquivo." });
                }
            });
        } else {
            res.status(404).json({ mensagem: "Arquivo encontrado no registro, mas não no disco do servidor." });
        }

    } catch (dbError) {
        console.error("Erro ao consultar o banco de dados para download:", dbError);
        res.status(500).json({ mensagem: "Erro interno do servidor ao buscar o arquivo." });
    }
});


//  Listagem (GET) - NOVO ENDPOINT
app.get('/arquivos', async (req, res) => {
    try {
        const query = `
            SELECT id, nome_original, data_upload 
            FROM arquivos_pdf 
            ORDER BY data_upload DESC;
        `;
        const result = await db.query(query);

        // Retorna a lista de arquivos para o frontend
        res.status(200).json(result.rows);

    } catch (dbError) {
        console.error("Erro ao listar arquivos:", dbError);
        res.status(500).json({ mensagem: "Erro interno do servidor ao buscar a lista de arquivos." });
    }
});


app.listen(port, () => {
  console.log(`Servidor de upload rodando em http://localhost:${port}`);
});