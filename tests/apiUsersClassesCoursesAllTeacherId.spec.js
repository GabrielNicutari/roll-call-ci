const supertest = require('supertest');
const server = require('../app');
const { formatDate } = require('./helperMethods');
const { pool } = require('../database/connection');
const {
  saveTeacherToDB,
  saveLectureToDB,
  saveCourseToDB,
  deleteTeachersFromDB,
  deleteLecturesFromDB,
  deleteCoursesFromDB,
  saveClassToDB,
  deleteClassesFromDB,
} = require('./dbMethods');

describe('GET /api/users/classes/courses/all/:teacherId', () => {
  let teacherId;
  let accessToken;

  beforeAll(async () => {
    teacherId = await saveTeacherToDB();
    const loginResponse = await supertest(server).post('/api/users/login').send({
      email: 'dimi1@gmail.com',
      password: '123$'
    });
    accessToken = loginResponse.body.accessToken;
  });

  afterEach(async () => {
    await deleteLecturesFromDB();
    await deleteCoursesFromDB();
    await deleteClassesFromDB();
  });

  afterAll(async () => {
    await deleteTeachersFromDB();
    pool.end();
  });

  test('should get a single course for a given teacher', async () => {
    const dateTime = formatDate(new Date());
    await saveCourseToDB(1, 'Development of Large Systems');
    await saveClassToDB(1, 'SD22w');
    await saveLectureToDB(teacherId, dateTime, 1, 1);
    await supertest(server).get(`/api/users/classes/courses/all/${teacherId}`)
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(200)
      .then((response) => {
        expect(Array.isArray(response.body)).toBeTruthy();
        expect(response.body[0].course_id).toEqual(1);
        expect(response.body[0].class_id).toEqual(1);
        expect(response.body[0].courseName).toEqual('Development of Large Systems');
      })
      .catch(async (error) => {
        throw new Error(error);
      });
  }, 20000);

  test('should get multiple courses for a teacher', async () => {
    const dateTime = formatDate(new Date());
    await saveCourseToDB(1, 'Development of Large Systems');
    await saveCourseToDB(2, 'Testing');
    await saveClassToDB(1, 'SD22w');
    await saveClassToDB(2, 'SD23w');
    await saveLectureToDB(teacherId, dateTime, 1, 1);
    await saveLectureToDB(teacherId, dateTime, 2, 2);
    await supertest(server).get(`/api/users/classes/courses/all/${teacherId}`)
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(200)
      .then((response) => {
        expect(Array.isArray(response.body)).toBeTruthy();
        expect(response.body.length).toEqual(2);
        expect(response.body[0].course_id).toEqual(1);
        expect(response.body[0].class_id).toEqual(1);
        expect(response.body[0].courseName).toEqual('Development of Large Systems');
        expect(response.body[1].course_id).toEqual(2);
        expect(response.body[1].class_id).toEqual(2);
        expect(response.body[1].courseName).toEqual('Testing');
      })
      .catch(async (error) => {
        throw new Error(error);
      });
  }, 20000);

  test('should return an empty array if the teacher id is string', async () => {
    await supertest(server).get('/api/users/classes/courses/all/randomString')
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(200)
      .then((response) => {
        expect(Array.isArray(response.body)).toBeTruthy();
        expect(response.body.length).toEqual(0);
      })
      .catch(async (error) => {
        throw new Error(error);
      });
  }, 20000);

  test('should return status code 404 if the teacher id is not defined (null)', async () => {
    await supertest(server).get('/api/users/classes/courses/all/')
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(404)
      .then()
      .catch(async (error) => {
        throw new Error(error);
      });
  }, 20000);
});
