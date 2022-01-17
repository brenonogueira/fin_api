const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();

//receber json
app.use(express.json());

const customers = [];

//Middleware
function verifyIfExistsAccountCPF(req, res, next) {
  const { cpf } = req.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);

  if (!customer) {
    return res.status(400).json({ error: "customer not found" });
  }

  //passando objeto do middleware via request
  req.customer = customer;

  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if(operation.type === "credit") {
      return acc + operation.amount
    } else {
      return acc - operation.amount
    }
  }, 0)

  return balance;
}

//criar conta
app.post("/account", (req, res) => {
  const { cpf, name } = req.body;

  //verifica se customer já existe
  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists) {
    return res.status(400).json({ error: "customer already exists" });
  }

  customers.push({
    name,
    cpf,
    id: uuidv4(),
    statement: [],
  });

  return res.status(201).send();
});

//uso do middleware
//app.use(verifyIfExistsAccountCPF) // tudo que tiver abaixo passará pelo middleware

//buscar extrato do cliente
app.get("/statement/", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req; //recebendo customer do middleware
  return res.json(customer.statement);
});

//inserir deposito
app.post("/deposit", verifyIfExistsAccountCPF, (req, res) => {
  const { description, amount } = req.body;

  const { customer } = req;

  const statementOperation = {
    description,
    amount,
    type: "credit",
    created_at: new Date(),
  };

  customer.statement.push(statementOperation);

  return res.status(201).send();
});

//busca extrato por data
app.get("/statement/date", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req; //recebendo customer do middleware
  const { date } = req.query;

  //zerando a hora e considerando apenas o dia
  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter(
    (statement) =>
      statement.created_at.toDateString() ===
      new Date(dateFormat).toDateString()
  );

  return res.json(statement);
});

//atualizar dados da conta
app.put("/account", verifyIfExistsAccountCPF, (req, res) => {
  const { name } = req.body;
  const { customer } = req;

  customer.name = name;

  return res.status(201).send();
});

//obter dados da conta
app.get("/account", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;

  return res.json(customer)
});

app.delete("/account", verifyIfExistsAccountCPF, (req, res) => {
  const { customer} = req;

  //splice
  customers.splice(customer, 1)

  return res.status(200).json(customers)
})

//balance
app.get("/balance", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;

  const balance = getBalance(customer.statement)

  return res.json(balance)
})

app.listen(3333);
