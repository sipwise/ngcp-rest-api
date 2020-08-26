'use strict';

const supertest = require('supertest');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const app = require('../src/app');

const { expect } = chai;
const server = supertest.agent(app);
const url = '/api/domains/';

chai.use(sinonChai);

describe('basic authorization', () => {
  it('basic authorization', done => {
    server
      .get(url)
      .expect(401)
      .end((err, res) => {
        expect(res.status).to.equal(401);
        //expect(res.body.message).to.equal(
        //    'test json response'
        //);
        done();
      });
  });
});

describe('/api/domains collection', () => {
  it('GET /api/domains collection', done => {
    server
      .get(url)
      .auth('administrator', 'administrator')
      .expect(200)
      .end((err, res) => {
        expect(res.status).to.equal(200);
        //expect(res.body.message).to.equal(
        //    'test json response'
        //);
        done();
      });
  });
});
