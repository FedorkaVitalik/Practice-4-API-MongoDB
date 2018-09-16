//Підключення модулів
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;

const app = express();
const urlencodedParser = bodyParser.urlencoded({
    extended: false
});

let collection;
let db;
//Функція, яка зчитує дані з файлу,
//або якщо він пустий то записує нові дані, зчитуючи їх з іншого файлу

//Обробник запиту глобальних даних
app.get('/getGlobal', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3001');

    collection.find().toArray((err, result) => {
        if (err) {
            console.error(err);
        } else {
            console.log(result);
            const data = result[0];
            res.send(JSON.stringify(data.faculties));
        }
    });
});

function sendNote(params, res) {
    collection.find().toArray((err, result) => {
        if (err) {
            console.error(err);
            res.error('ERROR');
        } else {
            const data = result[0];
            const courseData =
                data.students[params.facult][params.spec][params.course];
            const note = {};
            for (const stud in courseData) {
                const mark = courseData[stud][params.subj];
                note[stud] = mark === undefined ? null : mark;
            }
            res.send(JSON.stringify(note));
        }
    });
}
//Обробник запиту виведення студентів конкретного курсу
app.get('/getNote', (req, res) => {
    console.log(req.query);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3001');
    sendNote(req.query, res);
});

//Обробник запиту виставлення оцінки конкретному студенту з конкретного предмету
app.post('/setMark', urlencodedParser, (req, res) => {
    console.log(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3001');
    collection.find().toArray((err, result) => {
        if (err) {
            console.error(err);
        } else {
            console.log(result);
            const data = result[0];

            if (
                data &&
                data.students &&
                data.students[req.body.facult] &&
                data.students[req.body.facult][req.body.spec] &&
                data.students[req.body.facult][req.body.spec][req.body.course] &&
                data.students[req.body.facult][req.body.spec][req.body.course][
                    req.body.student
                ]
            ) {
                const studentData =
                    data.students[req.body.facult][req.body.spec][req.body.course][
                        req.body.student
                    ];
                const subject = req.body.subj;
                const subjects =
                    data.faculties[req.body.facult][req.body.spec][req.body.course];
                if (subjects.includes(subject)) {
                    studentData[subject] = req.body.mark;
                } else {
                    console.log('Такого предмета немає');
                }
                // writeFileData(data);
                collection.save(data, data.students);
                res.send(JSON.stringify(studentData));
            } else {
                const errorMsg =
                    'Не відповідність даних(дані на сервері або параметр факультет, спеціальність, курс, студент)';
                console.error(errorMsg);
                res.status(500).send(JSON.stringify(errorMsg));
            }
        }
    });
});

//Обробник запиту добавлення студента
app.post('/addStud', urlencodedParser, (req, res) => {
    console.log(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3001');

    if (req.body.newStud === '') {
        res.status(500).send(JSON.stringify({
            err: 'ПІБ студента не вказано'
        }));
        return;
    }

    collection.find().toArray((err, result) => {
        if (err) {
            console.error(err);
        } else {
            const data = result[0];
            data.students[req.body.facult][req.body.spec][req.body.course][req.body.newStud] = {};
            // collection.save(data, data.students, () => sendNote(req.body, res));

            collection.save(data, data.students, () => res.send({
                result: true
            }));
        }
    });
});

//Обробник запиту видалення студента
app.post('/deleteStud', urlencodedParser, (req, res) => {
    console.log(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3001');
    collection.find().toArray((err, result) => {
        if (err) {
            console.error(err);
        } else {
            console.log(result);
            const data = result[0];
            const courseStudents =
                data.students[req.body.facult][req.body.spec][req.body.course];
            for (const stud in courseStudents) {
                if (stud === req.body.stud) {
                    delete courseStudents[stud];
                }
            }
            collection.save(data, data.students);
            res.send(JSON.stringify(courseStudents));
        }
    });
});

//Обробник запиту перевірки всіх студентів на наявність незадовільної оцінки
app.post('/retake', urlencodedParser, (req, res) => {
    console.log(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3001');
    collection.find().toArray((err, result) => {
        if (err) {
            console.error(err);
        } else {
            const data = result[0];

            const retakeInfo = [];
            const facultCounterInfo = {};

            const students = data.students;
            for (const f in students) {
                let facultCounter = 0;
                for (const s in students[f]) {
                    for (const c in students[f][s]) {
                        const studObj = students[f][s][c];
                        for (const student in studObj) {
                            const subjectsPassed = studObj[student];
                            for (const subj in subjectsPassed) {
                                const marks = subjectsPassed[subj];
                                if (marks.includes('Незадовільно')) {
                                    retakeInfo.push({
                                        student,
                                        subj,
                                        f,
                                        s
                                    });
                                    facultCounter++;
                                }
                            }
                        }
                    }
                }
                if (facultCounter) {
                    facultCounterInfo[f] = facultCounter;
                }
            }

            res.send(
                JSON.stringify({
                    retakeInfo,
                    facultCounterInfo
                })
            );
        }
    });
});

MongoClient.connect(
    'mongodb://localhost:27017/', {
        useNewUrlParser: true
    },
    (err, client) => {
        if (err) {
            return console.log(err);
        }
        app.listen(3000, 'localhost');
        db = client.db('myapi');
        collection = db.collection('data');
        collection.find().toArray((err, result) => {
            if (err) {
                console.error(err);
            } else {
                const data = result[0];
                if (!data) {
                    const initData = fs.readFileSync('initialData.json', 'utf-8');
                    collection.insert(JSON.parse(initData));
                }
            }
        });
    }
);