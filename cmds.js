const {log, biglog, errorlog, colorize} = require("./out");
const {models} = require('./model');
const Sequelize = require('sequelize');

exports.helpCmd = rl => {
	log("Comandos:");
  	log("h|help - Muestra esta ayuda.");
  	log("list - Lista los quizzes existentes.");
  	log("show <id> - Muestra la pregunta y la respuesta al quiz indicado.");
  	log("add - Añade un nuevo quiz interactivamente.");
  	log("delete <id> - Borra el quiz indicado.");
  	log("edit <id> - Edita el quiz indicado.");
  	log("test <id> - Prueba el quiz indicado.");
  	log("p|play - Juega a preguntar aleatoriamente todos los quizzes.");
 	log("credits - Créditos.");
  	log("q|quit - Sale del programa.");
  	rl.prompt();
};

exports.listCmd = rl => {
    
    models.quiz.findAll()
    .each(quiz => {
        log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });

};

const validateId = id => {

    return new Sequelize.Promise((resolve, reject) => {
        if(typeof id ==="undefined") {
           reject(new Error(`Falta el parámetro <id>.`));
        } else {
            id = parseInt(id);
            if (Number.isNaN(id)) {
                reject(new Error(`El valor del parámetro <id> no es un número.`));
            } else {
                resolve(id);
            }
        }
    });
};

exports.showCmd = (rl, id) => {

   validateId(id)
   .then(id => models.quiz.findById(id))
   .then(quiz => {
       if (!quiz) {
           throw new Error(`No existe un quiz asociado al id=${id}.`);
       }
       log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
   })
   .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};

const makeQuestion = (rl, text) => {
    return new Sequelize.Promise((resolve, reject) => {
        rl.question(colorize(text, 'red'), answer => {
            resolve(answer.trim());
        });
    });
};

exports.addCmd = rl => {
    makeQuestion(rl, 'Introduzca una pregunta: ')
    .then(q => {
        return makeQuestion(rl, 'Introduzca la respuesta: ')
        .then(a => {
            return {question: q, answer: a};
        });
    })
    .then(quiz => {
        return models.quiz.create(quiz);
    })
    .then(quiz => {
        log(` ${colorize('Se ha añadido', 'magenta')}: ${question} ${colorize('=>', 'magenta')} ${answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog('El quiz es erróneo: ');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};

exports.deleteCmd = (rl, id) => {

    validateId(id)
    .then(id => models.quiz.destroy({where: {id}}))
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};

exports.editCmd = (rl, id) => {
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if (!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }

        process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
        return makeQuestion(rl, ' Introduzca la pregunta: ')
        .then(q => {
            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
            return makeQuestion(rl, ' Introduzca la respuesta: ')
            .then(a => {
                quiz.answer = q;
                quiz.answer = a;
                return quiz;
            });    
        });
    })
    .then(quiz => {
        return quiz.save();
    })
    .then(quiz => {
        log(`Se ha cambiado el quiz ${colorize(id, 'magenta')} por: ${question} ${colorize('=>', 'magenta')} ${answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog('El quiz es erróneo;');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};


exports.testCmd = (rl,id) => {
    
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if (!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }
        log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
        return makeQuestion(rl, ' Introduzca la respuesta: ')
        .then(a => {
            if(quiz.answer.toLowerCase() === a.toLowerCase().trim()){
                log("Su respuesta es correcta");
                biglog('Correcta', 'green');
            } else{
                log("Su respuesta es incorrecta");
                biglog('Incorrecta', 'red');
            }
        });
        
})
    .catch (error => {
            errorlog(error.message);
    })
    .then(() => {  
            rl.prompt();
    });
};

exports.playCmd = rl => {

    let score = 0;
    let toBeResolved = [];
    //for (let i = 0; i < model.count(); i++){
       // toBeResolved[i] = i;
    //}

    const playOne = () => {
        return new Sequelize.Promise((resolve,reject) => {
            if (toBeResolved.length <= 0) {
                log(`No hay nada más que preguntar.`);
                log(`${score}`, "magenta");
                resolve();
             }else {

                    let id = Math.floor(toBeResolved.length * Math.random());
                    let quiz = toBeResolved[id];
                    rl.question(colorize(`${quiz.question}: `, 'red'), answer => {
                        if (answer.trim().toLowerCase() === quiz.answer.trim().toLowerCase()){
                             score++;
                             toBeResolved.splice(id, 1);
                             log(`CORRECTO - LLeva ${score} aciertos.`);
                             resolve(playOne());
                        }else {
                             log(`INCORRECTO.`);
                             log(`Fin del juego. Aciertos:`);
                             log(`${score}`, 'magenta');
                             resolve();
                        }
                    });
            }
        })  
    };

    models.quiz.findAll({raw: true})
    .then(quizzes => {
        toBeResolved = quizzes;
    })
    .then(() => {
        return playOne();
    })
    .catch(error => {
        console.log(error);
    })
    .then(() => {
        log(score,'magenta');
        rl.prompt();
    })
};        

exports.creditsCmd = rl => {
    log("Autor de la práctica:");
    log("Cristina López ALonso", "green");
    rl.prompt();
};

exports.quitCmd = rl => {
    rl.close();
};